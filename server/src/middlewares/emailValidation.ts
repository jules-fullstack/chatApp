import { Request, Response, NextFunction } from 'express';
import { emailValidationService } from '../services/emailValidationService';

export interface EmailValidationRequest extends Request {
  emailValidation?: {
    isValid: boolean;
    score: number;
    result: string;
    reasons: string[];
    email: string;
  };
}

interface ValidationOptions {
  strict?: boolean; // If true, only accept 'deliverable' emails
  allowRisky?: boolean; // If true, allow risky emails with good scores
  emailField?: string; // Field name in req.body that contains the email (default: 'email')
  skipValidation?: boolean; // Skip validation in certain environments
}

export const validateEmail = (options: ValidationOptions = {}) => {
  return async (req: EmailValidationRequest, res: Response, next: NextFunction) => {
    try {
      const {
        strict = false,
        allowRisky = true,
        emailField = 'email',
        skipValidation = process.env.NODE_ENV === 'test'
      } = options;

      // Skip validation in test environment or if explicitly disabled
      if (skipValidation) {
        return next();
      }

      const email = req.body[emailField];

      if (!email) {
        res.status(400).json({
          success: false,
          message: `${emailField} is required`
        });
        return;
      }

      if (typeof email !== 'string') {
        res.status(400).json({
          success: false,
          message: `${emailField} must be a string`
        });
        return;
      }

      // Validate the email using Hunter.io
      const validationResult = await emailValidationService.validateEmail(email);
      
      // Attach validation result to request for potential use in route handlers
      req.emailValidation = validationResult;

      // Apply validation logic based on options
      let isAcceptable = false;

      if (strict) {
        // Strict mode: only accept deliverable emails
        isAcceptable = validationResult.result === 'deliverable';
      } else {
        // Normal mode: use the service's built-in logic
        isAcceptable = validationResult.isValid;
        
        // Override for risky emails if not allowed
        if (!allowRisky && validationResult.result === 'risky') {
          isAcceptable = false;
        }
      }

      if (!isAcceptable) {
        const reasonText = validationResult.reasons.length > 0 
          ? ` Reasons: ${validationResult.reasons.join(', ')}`
          : '';
        
        res.status(400).json({
          success: false,
          message: `Invalid email address.${reasonText}`,
          emailValidation: {
            result: validationResult.result,
            score: validationResult.score,
            reasons: validationResult.reasons
          }
        });
        return;
      }

      // Email is valid, continue to the next middleware/route handler
      next();

    } catch (error) {
      console.error('Email validation middleware error:', error);
      
      // In case of validation service failure, we can either:
      // 1. Fail safe (reject the request)
      // 2. Fail open (allow the request to continue)
      // Here we choose to fail open with a warning
      
      console.warn('Email validation failed, allowing request to continue');
      next();
    }
  };
};

// Specialized middleware variants for different use cases
export const validateEmailStrict = validateEmail({ 
  strict: true, 
  allowRisky: false 
});

export const validateEmailForOTP = validateEmail({ 
  strict: false, 
  allowRisky: true 
});

export const validateEmailForInvitation = validateEmail({ 
  strict: false, 
  allowRisky: false 
});

export const validateEmailForNotification = validateEmail({ 
  strict: false, 
  allowRisky: true 
});

// Batch email validation middleware for routes that accept multiple emails
export const validateEmailBatch = (options: ValidationOptions & { emailsField?: string } = {}) => {
  return async (req: EmailValidationRequest, res: Response, next: NextFunction) => {
    try {
      const {
        strict = false,
        allowRisky = true,
        emailsField = 'emails',
        skipValidation = process.env.NODE_ENV === 'test'
      } = options;

      if (skipValidation) {
        return next();
      }

      const emails = req.body[emailsField];

      if (!emails || !Array.isArray(emails)) {
        res.status(400).json({
          success: false,
          message: `${emailsField} must be an array`
        });
        return;
      }

      if (emails.length === 0) {
        res.status(400).json({
          success: false,
          message: `${emailsField} cannot be empty`
        });
        return;
      }

      // Validate all emails
      const validationResults = await emailValidationService.validateBatch(emails);
      
      // Check which emails are invalid
      const invalidEmails = validationResults.filter(result => {
        if (strict) {
          return result.result !== 'deliverable';
        }
        
        let isAcceptable = result.isValid;
        if (!allowRisky && result.result === 'risky') {
          isAcceptable = false;
        }
        
        return !isAcceptable;
      });

      if (invalidEmails.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid email addresses found`,
          invalidEmails: invalidEmails.map(result => ({
            email: result.email,
            result: result.result,
            reasons: result.reasons
          }))
        });
        return;
      }

      // All emails are valid
      req.emailValidation = {
        batchResults: validationResults,
        allValid: true
      } as any;

      next();

    } catch (error) {
      console.error('Batch email validation middleware error:', error);
      console.warn('Batch email validation failed, allowing request to continue');
      next();
    }
  };
};