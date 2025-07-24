import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

class ConversationService {
  /**
   * Standard population configuration for conversation queries
   */
  getConversationPopulateConfig() {
    return [
      {
        path: 'participants',
        select: 'firstName lastName userName lastActive',
        populate: {
          path: 'avatar',
          match: { isDeleted: false },
          select: 'url filename originalName mimeType metadata',
        },
      },
      {
        path: 'groupAdmin',
        select: 'firstName lastName userName',
        populate: {
          path: 'avatar',
          match: { isDeleted: false },
          select: 'url filename originalName mimeType metadata',
        },
      },
      'lastMessage',
      {
        path: 'groupPhoto',
        match: { isDeleted: false },
        select: 'url filename originalName mimeType metadata',
      },
    ];
  }

  /**
   * Get populated conversation by ID
   */
  async getPopulatedConversation(conversationId: string) {
    return await Conversation.findById(conversationId)
      .populate(this.getConversationPopulateConfig())
      .lean();
  }

  /**
   * Standard population configuration for message queries
   */
  getMessagePopulateConfig() {
    return [
      'sender',
      {
        path: 'sender',
        select: 'firstName lastName userName',
        populate: {
          path: 'avatar',
          match: { isDeleted: false },
          select: 'url filename originalName mimeType metadata',
        },
      },
      {
        path: 'attachments',
        match: { isDeleted: false },
        select: 'url filename originalName mimeType size metadata usage',
      },
    ];
  }

  /**
   * Extended message population config that includes group event data
   */
  getExtendedMessagePopulateConfig() {
    return [
      ...this.getMessagePopulateConfig(),
      {
        path: 'groupEventData.targetUser',
        select: 'firstName lastName userName',
        populate: {
          path: 'avatar',
          match: { isDeleted: false },
          select: 'url filename originalName mimeType metadata',
        },
      },
    ];
  }

  /**
   * Population config for conversations list (includes lastMessage details)
   */
  getConversationsListPopulateConfig() {
    return [
      {
        path: 'participants',
        select: 'firstName lastName userName lastActive',
        populate: {
          path: 'avatar',
          match: { isDeleted: false },
          select: 'url filename originalName mimeType metadata',
        },
      },
      {
        path: 'groupAdmin',
        select: 'firstName lastName userName',
        populate: {
          path: 'avatar',
          match: { isDeleted: false },
          select: 'url filename originalName mimeType metadata',
        },
      },
      {
        path: 'lastMessage',
        populate: [
          {
            path: 'sender',
            select: 'firstName lastName userName',
          },
          {
            path: 'groupEventData.targetUser',
            select: 'firstName lastName userName',
          },
        ],
      },
      {
        path: 'groupPhoto',
        select: 'url filename originalName mimeType metadata isDeleted',
      },
    ];
  }

  /**
   * Get conversations for a user with standard population
   */
  async getUserConversations(userId: string) {
    return await Conversation.find({
      participants: userId,
      isActive: true,
    })
      .sort({ lastMessageAt: -1 })
      .populate(this.getConversationsListPopulateConfig())
      .lean();
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getConversationMessages(conversationId: string, limit: number, before?: string) {
    let messageQuery: any = { conversation: conversationId };

    if (before) {
      messageQuery.createdAt = { $lt: new Date(before) };
    }

    return await Message.find(messageQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate(this.getExtendedMessagePopulateConfig());
  }

  /**
   * Get populated message by ID
   */
  async getPopulatedMessage(messageId: string, includeConversation = false) {
    const populateConfig = [...this.getMessagePopulateConfig()];
    if (includeConversation) {
      populateConfig.push('conversation');
    }

    return await Message.findById(messageId).populate(populateConfig);
  }

  /**
   * Find or create a direct conversation between two users
   */
  async findOrCreateDirectConversation(senderId: string, recipientId: string) {
    // Try to find existing conversation
    let conversation = await (Conversation as any).findBetweenUsers(senderId, recipientId);

    if (!conversation) {
      // Create new direct conversation
      conversation = new Conversation({
        participants: [senderId, recipientId],
        isGroup: false,
        lastMessageAt: new Date(),
        unreadCount: new Map([
          [senderId, 0],
          [recipientId, 0],
        ]),
        readAt: new Map([
          [senderId, new Date()],
          [recipientId, new Date(0)], // Initialize with epoch for new conversations
        ]),
      });
      await conversation.save();
    }

    return conversation;
  }

  /**
   * Create a new group conversation
   */
  async createGroupConversation(participants: string[], groupName: string | null, adminId: string) {
    // Create group conversation using existing model method
    const conversation = await (Conversation as any).createGroup(
      participants,
      groupName,
      adminId,
    );

    // Initialize unread counts and readAt for all participants
    const unreadCount = new Map();
    const readAt = new Map();
    
    participants.forEach((participantId) => {
      unreadCount.set(participantId, 0);
      readAt.set(participantId, participantId === adminId ? new Date() : new Date(0));
    });
    
    conversation.unreadCount = unreadCount;
    conversation.readAt = readAt;
    await conversation.save();

    return conversation;
  }

  /**
   * Validate recipients exist in database
   */
  async validateRecipientsExist(recipients: string[]) {
    const User = (await import('../models/User.js')).default;
    const recipientUsers = await User.find({ _id: { $in: recipients } });
    return recipientUsers.length === recipients.length;
  }

  /**
   * Find conversation between two users
   */
  async findConversationBetweenUsers(currentUserId: string, otherUserId: string) {
    return await (Conversation as any).findBetweenUsers(currentUserId, otherUserId);
  }
}

// Export singleton instance
export default new ConversationService();