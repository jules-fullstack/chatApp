import User from '../models/User.js';
import { Types } from 'mongoose';
import { populateUserWithAvatar } from '../utils/mediaQueries.js';

export interface UserInfo {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  userName: string;
}

export interface UserBasicInfo {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  role: string;
  avatar?: any;
  isEmailVerified?: boolean;
}

class UserService {
  /**
   * Get user's basic info (firstName, lastName, userName)
   */
  async getUserInfo(userId: string | Types.ObjectId): Promise<UserInfo | null> {
    return await User.findById(userId).select('firstName lastName userName');
  }

  /**
   * Get user's name info only (firstName, lastName)
   */
  async getUserNameInfo(
    userId: string | Types.ObjectId,
  ): Promise<UserBasicInfo | null> {
    return await User.findById(userId).select('firstName lastName');
  }

  /**
   * Get multiple users' basic info
   */
  async getMultipleUsersInfo(
    userIds: (string | Types.ObjectId)[],
  ): Promise<UserInfo[]> {
    return await User.find({ _id: { $in: userIds } }).select(
      'firstName lastName userName',
    );
  }

  /**
   * Get user's full name as string
   */
  async getUserFullName(userId: string | Types.ObjectId): Promise<string> {
    const user = await this.getUserNameInfo(userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Someone';
  }

  /**
   * Get user info with error handling - returns null if user not found
   */
  async getUserInfoSafe(
    userId: string | Types.ObjectId,
  ): Promise<UserInfo | null> {
    try {
      return await this.getUserInfo(userId);
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Get user profile with avatar populated
   */
  async getUserProfile(
    userId: string | Types.ObjectId,
  ): Promise<UserProfile | null> {
    const user = await populateUserWithAvatar(userId);
    if (!user) return null;

    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userInstance: any,
    profileData: {
      firstName: string;
      lastName: string;
      userName: string;
      newPassword?: string;
    },
  ): Promise<UserProfile> {
    const { firstName, lastName, userName, newPassword } = profileData;

    // Update user fields
    userInstance.firstName = firstName;
    userInstance.lastName = lastName;
    userInstance.userName = userName.toLowerCase();

    // Update password if provided
    if (newPassword && newPassword.trim() !== '') {
      userInstance.password = newPassword;
    }

    await userInstance.save();

    // Return updated user profile
    const updatedProfile = await this.getUserProfile(userInstance._id);
    if (!updatedProfile) {
      throw new Error('Failed to retrieve updated user profile');
    }
    return updatedProfile;
  }

  /**
   * Get paginated users with role filter
   */
  async getPaginatedUsers(
    page: number = 1,
    limit: number = 10,
    role: string = 'user',
  ) {
    const skip = (page - 1) * limit;
    const filter = { role };

    const total = await User.countDocuments(filter);

    const users = await User.find(filter, {
      password: 0,
      otp: 0,
      otpExpiry: 0,
    })
      .populate({
        path: 'avatar',
        match: { isDeleted: false },
        select: 'url filename originalName mimeType metadata',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const userData = users.map((user) => ({
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isBlocked: user.isBlocked,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      users: userData,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Block/unblock user by admin
   */
  async toggleUserBlockStatus(
    userId: string,
    isBlocked: boolean,
  ): Promise<string> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.isBlocked = isBlocked;
    await user.save();

    return user._id.toString();
  }

  /**
   * Add user to individual block list
   */
  async blockUserIndividually(
    currentUserId: string,
    targetUserId: string,
  ): Promise<string> {
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) throw new Error('Current user not found');

    currentUser.blockedUsers.push(new Types.ObjectId(targetUserId));
    await currentUser.save();

    return targetUserId;
  }

  /**
   * Remove user from individual block list
   */
  async unblockUserIndividually(
    currentUserId: string,
    targetUserId: string,
  ): Promise<string> {
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) throw new Error('Current user not found');

    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      (blockedUserId) =>
        !blockedUserId.equals(new Types.ObjectId(targetUserId)),
    );
    await currentUser.save();

    return targetUserId;
  }

  /**
   * Get user's blocked users list
   */
  async getUserBlockedList(userId: string) {
    const user = await User.findById(userId).populate({
      path: 'blockedUsers',
      select: 'firstName lastName userName avatar',
      populate: {
        path: 'avatar',
        match: { isDeleted: false },
        select: 'url filename originalName mimeType metadata',
      },
    });

    if (!user) return [];

    return user.blockedUsers.map((blockedUser: any) => ({
      id: blockedUser._id.toString(),
      firstName: blockedUser.firstName,
      lastName: blockedUser.lastName,
      userName: blockedUser.userName,
      avatar: blockedUser.avatar,
    }));
  }

  /**
   * Check if user is blocked by another user
   */
  async checkIfBlockedBy(
    currentUserId: string,
    otherUserId: string,
  ): Promise<boolean> {
    const otherUser = await User.findById(otherUserId).select('blockedUsers');
    if (!otherUser) return false;

    return otherUser.blockedUsers.includes(new Types.ObjectId(currentUserId));
  }

  /**
   * Search users by username (excluding current user)
   */
  async searchUsers(searchQuery: string, currentUserId: string, limit: number = 10) {
    const users = await User.find({
      _id: { $ne: currentUserId },
      role: 'user',
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
      .limit(limit)
      .lean();

    return users.map((user) => ({
      _id: user._id,
      userName: user.userName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
    }));
  }
}

// Export singleton instance
export default new UserService();
