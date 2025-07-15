import { Request, Response } from 'express';
import User from '../models/User.js';
import { IUser } from '../types/index.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  userName?: string;
  password?: string;
}

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { firstName, lastName, userName, password } =
      req.body as UpdateProfileRequest;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    // Validate required fields
    if (!firstName || !lastName || !userName) {
      res
        .status(400)
        .json({ message: 'First name, last name, and username are required' });
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

    // Update user fields
    user.firstName = firstName;
    user.lastName = lastName;
    user.userName = userName.toLowerCase();

    // Update password if provided
    if (password && password.trim() !== '') {
      user.password = password;
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
      isEmailVerified: user.isEmailVerified,
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
