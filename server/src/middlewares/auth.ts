import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';

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
          });
        } else {
          res.status(403).json({
            message: 'Your account has been blocked from the platform.',
          });
        }
      });
      return;
    }
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
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

const validationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Get the first error message for a cleaner response
    const firstError = errors.array()[0];
    res.status(400).json({
      message: firstError.msg,
      field: firstError.type === 'field' ? firstError.path : undefined,
      errors: errors.array(), // Keep full errors array for debugging if needed
    });
    return;
  }
  next();
};

export const validatePendingSession = [
  body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),

  validationMiddleware,

  (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    if (!req.session.pendingUser || req.session.pendingUser.email !== email) {
      res.status(400).json({ message: 'Invalid verification session' });
      return;
    }
    next();
  },
];

export const ensureUserExists = [
  body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),

  validationMiddleware,

  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: 'User not found' });
      return;
    }
    req.user = user;
    next();
  },
];

export const validateRegister = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('userName')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom(async (value) => {
      const existingUser = await User.findOne({ userName: value });
      if (existingUser) {
        throw new Error('Username already exists');
      }
      return true;
    }),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .custom(async (value) => {
      const existingUser = await User.findOne({ email: value });
      if (existingUser) {
        throw new Error('Email already exists');
      }
      return true;
    }),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  body('invitationToken')
    .optional()
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid invitation token format'),

  validationMiddleware,
];

export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),

  validationMiddleware,
];

export const validateOTP = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),

  validationMiddleware,
];

export const validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  validationMiddleware,
];
