import User from '../models/User.js';
import { Types } from 'mongoose';
import { checkMutualBlocking, BlockingCheckResult, UserBlockingInfo } from '../utils/blockingUtils.js';

class BlockingService {
  /**
   * Check blocking status for direct message creation
   */
  async validateDirectMessageBlocking(
    senderId: Types.ObjectId,
    recipientIds: string[]
  ): Promise<BlockingCheckResult> {
    if (recipientIds.length !== 1) {
      return { isBlocked: false };
    }

    const recipientObjectId = new Types.ObjectId(recipientIds[0]);

    // Get both users with their blocking information
    const [sender, recipient] = await Promise.all([
      User.findById(senderId).select('blockedUsers firstName lastName'),
      User.findById(recipientObjectId).select('blockedUsers firstName lastName'),
    ]);

    if (!sender) {
      return { isBlocked: true, message: 'Sender not found' };
    }

    if (!recipient) {
      return { isBlocked: true, message: 'Recipient not found' };
    }

    const senderInfo: UserBlockingInfo = {
      _id: sender._id,
      blockedUsers: sender.blockedUsers || [],
      firstName: sender.firstName,
      lastName: sender.lastName,
    };

    const recipientInfo: UserBlockingInfo = {
      _id: recipient._id,
      blockedUsers: recipient.blockedUsers || [],
      firstName: recipient.firstName,
      lastName: recipient.lastName,
    };

    return checkMutualBlocking(senderInfo, recipientInfo);
  }

  /**
   * Check blocking status for existing conversations
   */
  async validateExistingConversationBlocking(
    senderId: Types.ObjectId,
    participantIds: Types.ObjectId[]
  ): Promise<BlockingCheckResult> {
    // Only check for direct conversations (2 participants)
    if (participantIds.length !== 2) {
      return { isBlocked: false };
    }

    // Find the other participant (not the sender)
    const otherParticipantId = participantIds.find(
      (id) => id.toString() !== senderId.toString()
    );

    if (!otherParticipantId) {
      return { isBlocked: false };
    }

    // Get both users with their blocking information
    const [sender, otherParticipant] = await Promise.all([
      User.findById(senderId).select('blockedUsers firstName lastName'),
      User.findById(otherParticipantId).select('blockedUsers firstName lastName'),
    ]);

    if (!sender) {
      return { isBlocked: true, message: 'Sender not found' };
    }

    if (!otherParticipant) {
      return { isBlocked: true, message: 'Participant not found' };
    }

    const senderInfo: UserBlockingInfo = {
      _id: sender._id,
      blockedUsers: sender.blockedUsers || [],
      firstName: sender.firstName,
      lastName: sender.lastName,
    };

    const participantInfo: UserBlockingInfo = {
      _id: otherParticipant._id,
      blockedUsers: otherParticipant.blockedUsers || [],
      firstName: otherParticipant.firstName,
      lastName: otherParticipant.lastName,
    };

    return checkMutualBlocking(senderInfo, participantInfo);
  }

  /**
   * Filter recipients based on blocking relationships
   */
  async filterNotificationRecipients(
    senderId: Types.ObjectId,
    participantIds: Types.ObjectId[]
  ): Promise<Types.ObjectId[]> {
    // Get sender's blocking information
    const sender = await User.findById(senderId).select('blockedUsers');
    if (!sender) return [];

    // Get all participants' blocking information
    const participants = await User.find({
      _id: { $in: participantIds.filter(id => id.toString() !== senderId.toString()) }
    }).select('_id blockedUsers');

    const senderBlockedUsers = sender.blockedUsers || [];
    const allowedRecipients: Types.ObjectId[] = [];

    participants.forEach((participant) => {
      const participantBlockedUsers = participant.blockedUsers || [];
      
      // Check if sender has blocked this participant
      const senderBlockedParticipant = senderBlockedUsers.some(
        (blockedId) => blockedId.toString() === participant._id.toString()
      );

      // Check if participant has blocked sender
      const participantBlockedSender = participantBlockedUsers.some(
        (blockedId) => blockedId.toString() === senderId.toString()
      );

      // Only include if neither has blocked the other
      if (!senderBlockedParticipant && !participantBlockedSender) {
        allowedRecipients.push(participant._id);
      }
    });

    return allowedRecipients;
  }

  /**
   * Filter messages based on blocking relationships for a specific user
   */
  async filterMessagesForUser(
    messages: any[],
    currentUserId: Types.ObjectId,
    isGroupConversation: boolean
  ): Promise<any[]> {
    if (!isGroupConversation || messages.length === 0) {
      return messages;
    }

    // Get current user's blocking information
    const currentUser = await User.findById(currentUserId).select('blockedUsers');
    if (!currentUser) return messages;

    // Get unique sender IDs from messages
    const senderIds = [...new Set(messages.map(msg => msg.sender._id?.toString()).filter(Boolean))];
    
    // Get all senders' blocking information
    const senders = await User.find({
      _id: { $in: senderIds }
    }).select('_id blockedUsers');

    const currentUserBlockedUsers = currentUser.blockedUsers || [];
    const sendersBlockingInfo = new Map(
      senders.map(sender => [
        sender._id.toString(),
        sender.blockedUsers || []
      ])
    );

    // Filter messages based on blocking relationships
    return messages.filter((message) => {
      const senderId = message.sender._id?.toString();
      if (!senderId || senderId === currentUserId.toString()) {
        return true; // Keep user's own messages
      }

      const senderBlockedUsers = sendersBlockingInfo.get(senderId) || [];

      // Check if current user has blocked the sender
      const currentUserBlockedSender = currentUserBlockedUsers.some(
        (blockedId) => blockedId.toString() === senderId
      );

      // Check if sender has blocked current user
      const senderBlockedCurrentUser = senderBlockedUsers.some(
        (blockedId) => blockedId.toString() === currentUserId.toString()
      );

      // Only show message if neither has blocked the other
      return !currentUserBlockedSender && !senderBlockedCurrentUser;
    });
  }
}

// Export singleton instance
export default new BlockingService();