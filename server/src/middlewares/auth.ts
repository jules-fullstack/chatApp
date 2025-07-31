import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import {
  registerSchema,
  loginSchema,
  otpVerificationSchema,
  emailOnlySchema,
} from '../schemas/validations.js';
import { validateBody } from './zodValidation.js';

export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.isAuthenticated()) {
    if (req.user && (req.user as any).isBlocked) {
      req.logout((err) => {
        if (err) {
          console.error('Error logging out blocked user:', err);
          res.status(500).json({ message: 'Internal server error' });
          return;
        }

        if (req.session && typeof req.session.destroy === 'function') {
          req.session.destroy((sessionErr) => {
            if (sessionErr)
              console.error(
                'Error destroying session for blocked user:',
                sessionErr,
              );
            res.status(403).json({
              message: 'Your account has been blocked from the platform.',
            });
            return;
          });
        } else {
          res.status(403).json({
            message: 'Your account has been blocked from the platform.',
          });
          return;
        }
      });
      return;
    }

    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
  return;
};

export const ensureNotAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.status(400).json({ message: 'Already authenticated' });
};

export const ensureUserExists = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400).json({ message: 'User not found' });
    return;
  }
  req.user = user;
  next();
};

export const validatePendingSession = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { email } = req.body;
  if (!req.session.pendingUser || req.session.pendingUser.email !== email) {
    res.status(400).json({ message: 'Invalid verification session' });
    return;
  }
  next();
};

export const validateRegister = [
  validateBody(registerSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { userName, email } = req.body;

    // Check if username already exists
    const existingUserName = await User.findOne({ userName });
    if (existingUserName) {
      res.status(400).json({
        message: 'Validation error',
        errors: [{ field: 'userName', message: 'Username already exists' }],
      });
      return;
    }

    // Check if email already exists
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      res.status(400).json({
        message: 'Validation error',
        errors: [{ field: 'email', message: 'Email is already in use' }],
      });
      return;
    }

    next();
  },
];

export const validateLogin = validateBody(loginSchema);

export const validateOTP = validateBody(otpVerificationSchema);

export const validateEmail = validateBody(emailOnlySchema);
