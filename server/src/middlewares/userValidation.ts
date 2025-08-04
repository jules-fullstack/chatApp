import { Request, Response, NextFunction } from 'express';
import { IUser } from '../types/index.js';
import { updateProfileSchema } from '../schemas/validations.js';
import User from '../models/User.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

/**
 * Middleware to validate profile update request body
 */
export const validateProfileUpdate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const validationResult = updateProfileSchema.safeParse(req.body);

  if (!validationResult.success) {
    res.status(400).json({
      message: 'Validation error',
      errors: validationResult.error.issues,
    });
    return;
  }

  // Store validated data for controller use
  req.body = validationResult.data;
  next();
};

/**
 * Middleware to check if username is available
 */
export const validateUsernameAvailable = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userName } = req.body;
    const userId = req.user!._id;

    const existingUser = await User.findOne({
      userName: userName,
      _id: { $ne: userId },
    });

    if (existingUser) {
      res.status(400).json({ message: 'Username is already taken' });
      return;
    }

    next();
  } catch (error) {
    console.error('Error validating username availability:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to validate current password when changing password
 */
export const validateCurrentPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!._id;

    // Skip validation if no password change is requested
    if (!currentPassword && !newPassword) {
      return next();
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        message:
          'Both current password and new password are required for password change',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    // Store user instance for controller use
    req.body.userInstance = user;
    next();
  } catch (error) {
    console.error('Error validating current password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to validate user ID parameter exists
 */
export const validateUserIdParam = (paramName: string = 'userId') => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    const userId = req.params[paramName];

    if (!userId) {
      res.status(400).json({ message: 'User ID is required.' });
      return;
    }

    next();
  };
};

/**
 * Middleware to prevent self-targeting operations
 */
export const preventSelfAction = (paramName: string = 'userId') => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    const targetUserId = req.params[paramName];
    const currentUserId = req.user!._id.toString();

    if (currentUserId === targetUserId) {
      res
        .status(400)
        .json({ message: 'Cannot perform this action on yourself.' });
      return;
    }

    next();
  };
};

/**
 * Middleware to validate target user exists and store user info
 */
export const validateTargetUserExists = (paramName: string = 'userId') => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const targetUserId = req.params[paramName];
      const targetUser = await User.findById(targetUserId);

      if (!targetUser) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }

      if (!req.body) req.body = {};
      // Store target user for controller use
      req.body.targetUser = targetUser;

      next();
    } catch (error) {
      console.error('Error validating target user exists:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

/**
 * Middleware to prevent blocking admin users
 */
export const preventAdminBlocking = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const targetUser = req.body.targetUser;

  if (targetUser.role === 'superAdmin') {
    res.status(400).json({ message: 'Cannot block admin users.' });
    return;
  }

  next();
};

/**
 * Middleware to check if user is already blocked (for block operations)
 */
export const checkAlreadyBlocked = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const targetUser = req.body.targetUser;

  if (targetUser.isBlocked) {
    res.status(400).json({ message: 'User is already blocked.' });
    return;
  }

  next();
};

/**
 * Middleware to check if user is not blocked (for unblock operations)
 */
export const checkNotBlocked = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const targetUser = req.body.targetUser;

  if (!targetUser.isBlocked) {
    res.status(400).json({ message: 'User is not blocked.' });
    return;
  }

  next();
};

/**
 * Middleware to check if user is already individually blocked
 */
export const checkAlreadyIndividuallyBlocked = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const currentUser = req.user!;
  const targetUser = req.body.targetUser;

  if (currentUser.blockedUsers.includes(targetUser._id)) {
    res.status(400).json({ message: 'User is already blocked.' });
    return;
  }

  next();
};

/**
 * Middleware to check if user is not individually blocked
 */
export const checkNotIndividuallyBlocked = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const currentUser = req.user!;
  const targetUser = req.body.targetUser;

  if (!currentUser.blockedUsers.includes(targetUser._id)) {
    res.status(400).json({ message: 'User is not blocked.' });
    return;
  }

  next();
};

export const ensureUserInstance = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.body.userInstance && req.user) {
    req.body.userInstance = req.user;
  }
  next();
};
