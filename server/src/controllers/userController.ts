import { Request, Response } from 'express';
import User from '../models/User.js';
import { IUser } from '../types/index.js';
import { updateProfileSchema } from '../schemas/validations.js';
import { populateUserWithAvatar } from '../utils/mediaQueries.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  file?: Express.Multer.File;
}


export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    // Validate request body with Zod
    const validationResult = updateProfileSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validationResult.error.issues,
      });
      return;
    }

    const { firstName, lastName, userName, currentPassword, newPassword } =
      validationResult.data;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({
      userName: userName.toLowerCase(),
      _id: { $ne: userId },
    });

    if (existingUser) {
      res.status(400).json({ message: 'Username is already taken' });
      return;
    }

    // Find the current user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // If password change is requested, validate current password
    if (currentPassword && newPassword) {
      const isCurrentPasswordValid =
        await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        res.status(400).json({ message: 'Current password is incorrect' });
        return;
      }
    }

    // Update user fields
    user.firstName = firstName;
    user.lastName = lastName;
    user.userName = userName.toLowerCase();

    // Update password if provided
    if (newPassword && newPassword.trim() !== '') {
      user.password = newPassword;
    }

    // Save the updated user
    await user.save();

    // Get updated user with populated avatar
    const updatedUserWithAvatar = await populateUserWithAvatar(user._id);
    
    // Return updated user data (excluding password)
    const updatedUser = {
      id: updatedUserWithAvatar!._id.toString(),
      firstName: updatedUserWithAvatar!.firstName,
      lastName: updatedUserWithAvatar!.lastName,
      userName: updatedUserWithAvatar!.userName,
      email: updatedUserWithAvatar!.email,
      role: updatedUserWithAvatar!.role,
      avatar: updatedUserWithAvatar!.avatar,
    };

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
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await populateUserWithAvatar(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    (user as any).password = undefined;
    (user as any).otp = undefined;
    (user as any).otpExpiry = undefined;

    const userData = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
    };

    res.json({ user: userData });
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
      message: 'This endpoint has been deprecated. Please use /api/media/upload with parentType=User and usage=avatar instead.',
      newEndpoint: '/api/media/upload'
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
    const user = req.user;

    if (!user || user.role !== 'superAdmin') {
      res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      return;
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filter for users with role 'user' only
    const filter = { role: 'user' };

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    const users = await User.find(filter, {
      password: 0,
      otp: 0,
      otpExpiry: 0
    })
    .populate({
      path: 'avatar',
      match: { isDeleted: false },
      select: 'url filename originalName mimeType metadata',
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const userData = users.map(user => ({
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({ 
      users: userData,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext,
        hasPrev
      }
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
