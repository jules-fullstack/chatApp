import { Response } from 'express';
import User from '../models/User.js';
import { AuthRequest } from '../types/index.js';
// import { populateUsersWithAvatars } from '../utils/mediaQueries.js';

export const searchUsers = async (
  req: AuthRequest & { query: { query?: string } },
  res: Response,
): Promise<void> => {
  try {
    const { query } = req.query;
    const currentUserId = req.user?.id;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    if (!currentUserId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const searchQuery = query.trim();

    if (searchQuery.length < 1) {
      res
        .status(400)
        .json({ message: 'Search query must be at least 1 character long' });
      return;
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      userName: {
        $regex: searchQuery,
        $options: 'i',
      },
    })
      .select('_id userName firstName lastName avatar')
      .populate({
        path: 'avatar',
        match: { isDeleted: false },
        select: 'url filename originalName mimeType metadata',
      })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      users: users.map((user) => ({
        _id: user._id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
      })),
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
