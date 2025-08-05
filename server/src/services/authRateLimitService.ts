import RateLimit from '../models/RateLimit.js';
import { IRateLimit } from '../types/index.js';

interface AuthRateLimitConfig {
  successfulAttemptsLimit: number;
  failedAttemptsLimit: number;
  windowMs: number;
  lockoutThresholds: number[];
  lockoutDurations: number[];
}

interface AuthRateLimitResult {
  allowed: boolean;
  isLocked?: boolean;
  lockedUntil?: Date;
  remainingAttempts?: number;
  retryAfter?: number;
  nextLockoutAt?: number;
  failedAttempts?: number;
}

class AuthRateLimitService {
  private readonly config: AuthRateLimitConfig = {
    successfulAttemptsLimit: 10,
    failedAttemptsLimit: 15,
    windowMs: 60 * 1000, // 1 minute
    lockoutThresholds: [5, 10, 15],
    lockoutDurations: [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000], // 5min, 15min, 60min
  };

  private async getRateLimitRecord(key: string, type: 'ip' | 'user'): Promise<IRateLimit | null> {
    return await RateLimit.findOne({ key, type });
  }

  private async createOrUpdateRecord(
    key: string,
    type: 'ip' | 'user',
    isSuccess: boolean,
    shouldLock: boolean = false,
    lockoutLevel: number = 0
  ): Promise<IRateLimit> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowMs);

    let record = await this.getRateLimitRecord(key, type);

    if (!record) {
      record = new RateLimit({
        key,
        type,
        successfulAttempts: isSuccess ? 1 : 0,
        failedAttempts: isSuccess ? 0 : 1,
        totalFailedAttempts: isSuccess ? 0 : 1,
        windowStart: now,
        lockoutLevel: 0,
      });
    } else {
      // Reset window if expired
      if (record.windowStart < windowStart) {
        record.successfulAttempts = isSuccess ? 1 : 0;
        record.failedAttempts = isSuccess ? 0 : 1;
        record.windowStart = now;
      } else {
        // Increment counters
        if (isSuccess) {
          record.successfulAttempts += 1;
        } else {
          record.failedAttempts += 1;
          record.totalFailedAttempts += 1;
        }
      }

      // Apply lockout if needed
      if (shouldLock) {
        const lockoutDuration = this.config.lockoutDurations[lockoutLevel] || this.config.lockoutDurations[this.config.lockoutDurations.length - 1];
        record.lockedUntil = new Date(now.getTime() + lockoutDuration);
        record.lockoutLevel = Math.min(lockoutLevel + 1, this.config.lockoutDurations.length - 1);
      }

      // Reset failed attempts on successful login
      if (isSuccess) {
        record.totalFailedAttempts = 0;
        record.lockoutLevel = 0;
        record.lockedUntil = undefined;
      }
    }

    return await record.save();
  }

  private isLocked(record: IRateLimit | null): boolean {
    if (!record?.lockedUntil) return false;
    return new Date() < record.lockedUntil;
  }

  private isRateLimited(record: IRateLimit | null, isFailedAttempt: boolean): boolean {
    if (!record) return false;

    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowMs);

    // Check if window has expired
    if (record.windowStart < windowStart) return false;

    const limit = isFailedAttempt ? this.config.failedAttemptsLimit : this.config.successfulAttemptsLimit;
    const currentAttempts = isFailedAttempt ? record.failedAttempts : record.successfulAttempts;

    return currentAttempts >= limit;
  }

  private shouldApplyLockout(record: IRateLimit | null): { shouldLock: boolean; lockoutLevel: number } {
    if (!record) return { shouldLock: false, lockoutLevel: 0 };

    const failedAttempts = record.totalFailedAttempts;
    
    for (let i = 0; i < this.config.lockoutThresholds.length; i++) {
      if (failedAttempts >= this.config.lockoutThresholds[i]) {
        return { shouldLock: true, lockoutLevel: i };
      }
    }

    return { shouldLock: false, lockoutLevel: 0 };
  }

  public async checkAuthRateLimit(ip: string, identifier?: string): Promise<AuthRateLimitResult> {
    // Check IP-based rate limiting
    const ipRecord = await this.getRateLimitRecord(ip, 'ip');
    
    // Check if IP is locked
    if (this.isLocked(ipRecord)) {
      return {
        allowed: false,
        isLocked: true,
        lockedUntil: ipRecord!.lockedUntil,
        retryAfter: Math.ceil((ipRecord!.lockedUntil!.getTime() - Date.now()) / 1000),
        failedAttempts: ipRecord!.totalFailedAttempts,
      };
    }

    // Check user-based rate limiting if identifier provided
    if (identifier) {
      const userRecord = await this.getRateLimitRecord(identifier, 'user');
      
      if (this.isLocked(userRecord)) {
        return {
          allowed: false,
          isLocked: true,
          lockedUntil: userRecord!.lockedUntil,
          retryAfter: Math.ceil((userRecord!.lockedUntil!.getTime() - Date.now()) / 1000),
          failedAttempts: userRecord!.totalFailedAttempts,
        };
      }

      // Check if user is rate limited
      if (this.isRateLimited(userRecord, true)) {
        const remainingTime = this.config.windowMs - (Date.now() - userRecord!.windowStart.getTime());
        return {
          allowed: false,
          remainingAttempts: 0,
          retryAfter: Math.ceil(remainingTime / 1000),
          failedAttempts: userRecord!.totalFailedAttempts,
        };
      }
    }

    // Check if IP is rate limited
    if (this.isRateLimited(ipRecord, true)) {
      const remainingTime = this.config.windowMs - (Date.now() - ipRecord!.windowStart.getTime());
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfter: Math.ceil(remainingTime / 1000),
        failedAttempts: ipRecord!.totalFailedAttempts,
      };
    }

    // Calculate remaining attempts
    const ipFailedAttempts = ipRecord?.failedAttempts || 0;
    const userFailedAttempts = identifier ? (await this.getRateLimitRecord(identifier, 'user'))?.failedAttempts || 0 : 0;
    
    const remainingAttempts = Math.min(
      this.config.failedAttemptsLimit - ipFailedAttempts,
      identifier ? this.config.failedAttemptsLimit - userFailedAttempts : this.config.failedAttemptsLimit
    );

    return {
      allowed: true,
      remainingAttempts: Math.max(0, remainingAttempts),
      failedAttempts: Math.max(ipRecord?.totalFailedAttempts || 0, identifier ? (await this.getRateLimitRecord(identifier, 'user'))?.totalFailedAttempts || 0 : 0),
    };
  }

  public async recordAuthAttempt(ip: string, isSuccess: boolean, identifier?: string): Promise<void> {
    // Record IP attempt
    const ipRecord = await this.getRateLimitRecord(ip, 'ip');
    const { shouldLock: shouldLockIp, lockoutLevel: ipLockoutLevel } = isSuccess ? 
      { shouldLock: false, lockoutLevel: 0 } : 
      this.shouldApplyLockout(ipRecord);

    await this.createOrUpdateRecord(ip, 'ip', isSuccess, shouldLockIp, ipLockoutLevel);

    // Record user attempt if identifier provided
    if (identifier) {
      const userRecord = await this.getRateLimitRecord(identifier, 'user');
      const { shouldLock: shouldLockUser, lockoutLevel: userLockoutLevel } = isSuccess ? 
        { shouldLock: false, lockoutLevel: 0 } : 
        this.shouldApplyLockout(userRecord);

      await this.createOrUpdateRecord(identifier, 'user', isSuccess, shouldLockUser, userLockoutLevel);
    }
  }

  public async resetAuthLimits(ip: string, identifier?: string): Promise<void> {
    await RateLimit.deleteMany({ key: ip, type: 'ip' });
    
    if (identifier) {
      await RateLimit.deleteMany({ key: identifier, type: 'user' });
    }
  }

  public async cleanupExpiredRecords(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await RateLimit.deleteMany({
      updatedAt: { $lt: oneDayAgo },
      $or: [
        { lockedUntil: { $lt: new Date() } },
        { lockedUntil: { $exists: false } }
      ]
    });
  }
}

export const authRateLimitService = new AuthRateLimitService();