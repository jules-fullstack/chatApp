import { Types } from 'mongoose';

export interface BlockingCheckResult {
  isBlocked: boolean;
  message?: string;
}

export interface UserBlockingInfo {
  _id: Types.ObjectId;
  blockedUsers: Types.ObjectId[];
  firstName?: string;
  lastName?: string;
}

/**
 * Pure utility function to check if two users have a blocking relationship (either direction)
 * This is a pure function with no database dependencies
 */
export const checkMutualBlocking = (
  user1: UserBlockingInfo,
  user2: UserBlockingInfo
): BlockingCheckResult => {
  const user1HasBlockedUser2 = user1.blockedUsers.some(
    (blockedId) => blockedId.toString() === user2._id.toString()
  );

  const user2HasBlockedUser1 = user2.blockedUsers.some(
    (blockedId) => blockedId.toString() === user1._id.toString()
  );

  if (user1HasBlockedUser2 || user2HasBlockedUser1) {
    return {
      isBlocked: true,
      message: user1HasBlockedUser2 
        ? 'You have blocked this user and cannot send messages to them'
        : 'You cannot send messages to this user'
    };
  }

  return { isBlocked: false };
};