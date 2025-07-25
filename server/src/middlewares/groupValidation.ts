import { Request, Response, NextFunction } from 'express';
import { IUser } from '../types/index.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  conversation?: any;
}

/**
 * Middleware to validate that the conversation is a group conversation
 */

export const requireGroupConversation = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const conversation = req.conversation;

  if (!conversation.isGroup) {
    return res.status(400).json({
      message: 'This operation is only available for group conversations',
    });
  }

  next();
};

/**
 * Middleware to validate that the user is the group admin (with superAdmin bypass)
 */
export const requireGroupAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const conversation = req.conversation;
  const userId = req.user!._id;
  const userRole = req.user?.role;

  // SuperAdmin bypass or user is the group admin
  if (
    conversation.groupAdmin?.toString() !== userId.toString() &&
    userRole !== 'superAdmin'
  ) {
    return res.status(403).json({
      message: 'Only group admin can perform this operation',
    });
  }

  next();
};

/**
 * Middleware to validate that a user is a member of the group
 */
export const requireGroupMembership = (
  userIdField: string = 'userToRemoveId',
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const conversation = req.conversation;
    const targetUserId = req.body[userIdField];

    if (!conversation) {
      return res.status(400).json({ message: 'Conversation not found' });
    }

    if (!targetUserId) {
      return res.status(400).json({
        message: `${userIdField} is required`,
      });
    }

    // Check if target user is a participant
    if (
      !conversation.participants.some((p: any) => p.toString() === targetUserId)
    ) {
      return res.status(400).json({
        message: 'User is not a member of this group',
      });
    }

    next();
  };
};

/**
 * Middleware to prevent admin from removing/modifying themselves
 */
export const preventSelfModification = (
  userIdField: string = 'userToRemoveId',
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user!._id;
    const targetUserId = req.body[userIdField];

    if (targetUserId === userId.toString()) {
      return res.status(400).json({
        message: 'Cannot perform this operation on yourself',
      });
    }

    next();
  };
};

/**
 * Middleware to validate that users exist in the database
 */
export const validateUsersExist = (userIdsField: string = 'userIds') => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const User = (await import('../models/User.js')).default;
      const userIds = req.body[userIdsField];

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          message: `${userIdsField} are required and must be an array`,
        });
      }

      const users = await User.find({ _id: { $in: userIds } });
      if (users.length !== userIds.length) {
        return res.status(404).json({
          message: 'One or more users not found',
        });
      }

      next();
    } catch (error) {
      console.error('Error validating users exist:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

/**
 * Middleware to validate single user exists in the database
 */
export const validateUserExists = (userIdField: string = 'newAdminId') => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userService = (await import('../services/userService.js')).default;
      const userId = req.body[userIdField];

      if (!userId) {
        return res.status(400).json({
          message: `${userIdField} is required`,
        });
      }

      const user = await userService.getUserInfo(userId);
      if (!user) {
        return res.status(404).json({
          message: 'User not found',
        });
      }

      // Store user info for later use
      req.body[`${userIdField}Info`] = user;
      next();
    } catch (error) {
      console.error('Error validating user exists:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};
