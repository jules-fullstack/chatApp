import { IUser } from '../types/index.js';

/**
 * Format user data for API responses
 */
export const formatUserResponse = (user: IUser, avatarUrl: string | null) => ({
  id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  userName: user.userName,
  email: user.email,
  role: user.role,
  avatar: avatarUrl,
});