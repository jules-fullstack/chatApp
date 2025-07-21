import { Request, Response } from 'express';
import User from '../models/User.js';
import { IUser } from '../types/index.js';
import { updateProfileSchema } from '../schemas/validations.js';
import { uploadImageToS3 } from '../services/s3Service.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  file?: Express.Multer.File;
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  userName?: string;
  currentPassword?: string;
  newPassword?: string;
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

    // Return updated user data (excluding password)
    const updatedUser = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
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

    const user = await User.findById(userId).select(
      '-password -otp -otpExpiry',
    );
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

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
    const file = req.file;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    if (!file) {
      res.status(400).json({ message: 'No file provided' });
      return;
    }

    // Upload to S3
    const uploadResult = await uploadImageToS3(file, userId.toString());
    
    // Update user's avatar field
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.avatar = uploadResult.url;
    await user.save();

    res.json({
      message: 'Avatar uploaded successfully',
      avatar: uploadResult.url,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
