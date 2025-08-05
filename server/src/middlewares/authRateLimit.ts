import { Request, Response, NextFunction } from 'express';
import { authRateLimitService } from '../services/authRateLimitService.js';

interface AuthRateLimitOptions {
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
}

export const createAuthRateLimit = (options: AuthRateLimitOptions = {}) => {
  const {
    skipSuccessfulRequests = false,
    keyGenerator = (req: Request) => req.body.email || req.body.userName || 'anonymous',
    skipFailedRequests = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const identifier = keyGenerator(req);

      // Check rate limits
      const result = await authRateLimitService.checkAuthRateLimit(ip, identifier);

      if (!result.allowed) {
        const response: any = {
          error: 'Too many attempts',
          retryAfter: result.retryAfter,
        };

        if (result.isLocked) {
          const lockoutMinutes = Math.ceil(result.retryAfter! / 60);
          response.message = `Account temporarily locked due to too many failed attempts. Try again in ${lockoutMinutes} minute${lockoutMinutes !== 1 ? 's' : ''}.`;
          response.lockedUntil = result.lockedUntil;
          response.failedAttempts = result.failedAttempts;
          
          // Determine next lockout threshold
          const nextThreshold = [5, 10, 15].find(threshold => result.failedAttempts! < threshold);
          if (nextThreshold) {
            response.nextLockoutAt = nextThreshold;
          }
        } else {
          response.message = 'Rate limit exceeded. Please try again later.';
          response.remainingAttempts = result.remainingAttempts;
        }

        res.status(429).json(response);
        return;
      }

      // Add rate limit info to request for later use
      (req as any).rateLimitInfo = {
        ip,
        identifier,
        remainingAttempts: result.remainingAttempts,
        skipSuccessfulRequests,
        skipFailedRequests,
      };

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Continue without rate limiting if there's an error to avoid blocking legitimate users
      next();
    }
  };
};

// Middleware to record attempt after request completion
export const recordAuthAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const originalSend = res.json;
  
  res.json = function(data: any) {
    const rateLimitInfo = (req as any).rateLimitInfo;
    
    if (rateLimitInfo) {
      const { ip, identifier, skipSuccessfulRequests, skipFailedRequests } = rateLimitInfo;
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      
      // Skip recording based on options
      if ((isSuccess && skipSuccessfulRequests) || (!isSuccess && skipFailedRequests)) {
        return originalSend.call(this, data);
      }

      // Record the attempt asynchronously
      authRateLimitService.recordAuthAttempt(ip, isSuccess, identifier)
        .catch(error => console.error('Failed to record auth attempt:', error));
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Pre-configured middleware for different auth endpoints
export const loginRateLimit = createAuthRateLimit({
  keyGenerator: (req: Request) => req.body.email,
});

export const registerRateLimit = createAuthRateLimit({
  keyGenerator: (req: Request) => req.body.email,
  skipSuccessfulRequests: true, // Don't count successful registrations against rate limit
});

export const otpRateLimit = createAuthRateLimit({
  keyGenerator: (req: Request) => req.body.email,
});

export const forgotPasswordRateLimit = createAuthRateLimit({
  keyGenerator: (req: Request) => req.body.email,
  skipSuccessfulRequests: true, // Don't count successful password reset requests
});

export const resetPasswordRateLimit = createAuthRateLimit({
  keyGenerator: (req: Request) => req.body.email || req.body.token,
});