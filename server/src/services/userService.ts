import User from '../models/User.js';
import { Types } from 'mongoose';

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
  async getUserNameInfo(userId: string | Types.ObjectId): Promise<UserBasicInfo | null> {
    return await User.findById(userId).select('firstName lastName');
  }

  /**
   * Get multiple users' basic info
   */
  async getMultipleUsersInfo(userIds: (string | Types.ObjectId)[]): Promise<UserInfo[]> {
    return await User.find({ _id: { $in: userIds } }).select('firstName lastName userName');
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
  async getUserInfoSafe(userId: string | Types.ObjectId): Promise<UserInfo | null> {
    try {
      return await this.getUserInfo(userId);
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new UserService();