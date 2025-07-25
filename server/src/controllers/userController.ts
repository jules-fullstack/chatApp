import { Request, Response } from 'express';
import { IUser, AuthRequest } from '../types/index.js';
import userService from '../services/userService.js';
import WebSocketManager from '../config/websocket.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  file?: Express.Multer.File;
}

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { firstName, lastName, userName, newPassword } = req.body;
    const userInstance = req.body.userInstance; // From middleware

    const updatedUser = await userService.updateUserProfile(userInstance, {
      firstName,
      lastName,
      userName,
      newPassword,
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const user = await userService.getUserProfile(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const uploadAvatar = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    res.status(410).json({
      message:
        'This endpoint has been deprecated. Please use /api/media/upload with parentType=User and usage=avatar instead.',
      newEndpoint: '/api/media/upload',
    });
  } catch (error) {
    console.error('Error in deprecated uploadAvatar:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await userService.getPaginatedUsers(page, limit, 'user');
    res.json(result);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const blockUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const targetUser = req.body.targetUser; // From middleware
    const userId = await userService.toggleUserBlockStatus(
      targetUser._id.toString(),
      true,
    );

    res.json({
      message: 'User blocked successfully.',
      userId,
    });

    // Send WebSocket notification asynchronously after response
    setImmediate(() => {
      try {
        WebSocketManager.notifyUserBlocked(userId);
      } catch (wsError) {
        console.error('Error sending WebSocket notification:', wsError);
      }
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const unblockUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const targetUser = req.body.targetUser; // From middleware
    const userId = await userService.toggleUserBlockStatus(
      targetUser._id.toString(),
      false,
    );

    res.json({
      message: 'User unblocked successfully.',
      userId,
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const blockUserIndividual = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const currentUser = req.user!;
    const targetUser = req.body.targetUser; // From middleware

    const blockedUserId = await userService.blockUserIndividually(
      currentUser._id.toString(),
      targetUser._id.toString(),
    );

    res.json({
      message: 'User blocked successfully.',
      blockedUserId,
    });

    // Send WebSocket notification asynchronously after response
    setImmediate(() => {
      try {
        WebSocketManager.sendBlockingUpdate(
          currentUser._id.toString(),
          blockedUserId,
          'block',
        );
      } catch (wsError) {
        console.error('Error sending WebSocket notification:', wsError);
      }
    });
  } catch (error) {
    console.error('Error blocking user individually:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const unblockUserIndividual = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const currentUser = req.user!;
    const targetUser = req.body.targetUser; // From middleware

    const unblockedUserId = await userService.unblockUserIndividually(
      currentUser._id.toString(),
      targetUser._id.toString(),
    );

    res.json({
      message: 'User unblocked successfully.',
      unblockedUserId,
    });

    // Send WebSocket notification asynchronously after response
    setImmediate(() => {
      try {
        WebSocketManager.sendBlockingUpdate(
          currentUser._id.toString(),
          unblockedUserId,
          'unblock',
        );
      } catch (wsError) {
        console.error('Error sending WebSocket notification:', wsError);
      }
    });
  } catch (error) {
    console.error('Error unblocking user individually:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getBlockedUsers = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const currentUser = req.user!;
    const blockedUsers = await userService.getUserBlockedList(
      currentUser._id.toString(),
    );
    res.json({ blockedUsers });
  } catch (error) {
    console.error('Error getting blocked users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkIfBlockedBy = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { userId } = req.params;

    const isBlocked = await userService.checkIfBlockedBy(
      currentUser._id.toString(),
      userId,
    );

    res.json({
      isBlocked,
      blockedBy: userId,
    });
  } catch (error) {
    console.error('Error checking if blocked by user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchUsers = async (
  req: AuthRequest & { validatedQuery: { query: string } },
  res: Response,
): Promise<void> => {
  try {
    const { query } = req.validatedQuery;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const users = await userService.searchUsers(query, currentUserId);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
