interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimitService {
  private emailAttempts: Map<string, RateLimitEntry> = new Map();
  private readonly maxAttempts: number = 3;
  private readonly windowMs: number = 15 * 60 * 1000; // 15 minutes

  private cleanupExpired(): void {
    const now = Date.now();
    const emailsToDelete: string[] = [];
    
    this.emailAttempts.forEach((entry, email) => {
      if (now > entry.resetTime) {
        emailsToDelete.push(email);
      }
    });
    
    emailsToDelete.forEach(email => {
      this.emailAttempts.delete(email);
    });
  }

  public checkRateLimit(email: string): { allowed: boolean; timeUntilReset?: number } {
    this.cleanupExpired();
    
    const entry = this.emailAttempts.get(email);
    const now = Date.now();

    if (!entry) {
      return { allowed: true };
    }

    if (now > entry.resetTime) {
      this.emailAttempts.delete(email);
      return { allowed: true };
    }

    if (entry.count >= this.maxAttempts) {
      const timeUntilReset = Math.ceil((entry.resetTime - now) / 1000);
      return { allowed: false, timeUntilReset };
    }

    return { allowed: true };
  }

  public recordAttempt(email: string): void {
    this.cleanupExpired();
    
    const now = Date.now();
    const entry = this.emailAttempts.get(email);

    if (!entry) {
      this.emailAttempts.set(email, {
        count: 1,
        resetTime: now + this.windowMs
      });
    } else if (now > entry.resetTime) {
      this.emailAttempts.set(email, {
        count: 1,
        resetTime: now + this.windowMs
      });
    } else {
      entry.count++;
    }
  }

  public getRemainingAttempts(email: string): number {
    this.cleanupExpired();
    
    const entry = this.emailAttempts.get(email);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxAttempts;
    }
    
    return Math.max(0, this.maxAttempts - entry.count);
  }
}

export const rateLimitService = new RateLimitService();