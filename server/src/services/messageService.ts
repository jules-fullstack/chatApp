import Message from '../models/Message.js';
import Media from '../models/Media.js';
import Conversation from '../models/Conversation.js';
import { Types } from 'mongoose';
import conversationService from './conversationService.js';
import blockingService from './blockingService.js';

export interface MessageData {
  conversationId: string;
  senderId: string | Types.ObjectId;
  content?: string;
  messageType?: string;
  attachmentIds?: string[];
  images?: string[]; // For backward compatibility
}

export interface ConversationUpdateData {
  messageId: string | Types.ObjectId;
  senderId: string | Types.ObjectId;
  participants: Types.ObjectId[];
}

class MessageService {
  /**
   * Create a message with image handling (backward compatibility)
   */
  async createMessage(messageData: MessageData): Promise<any> {
    const {
      conversationId,
      senderId,
      content = '',
      messageType = 'text',
      attachmentIds = [],
      images = []
    } = messageData;

    let message;

    // Handle backward compatibility: convert images URLs to Media objects
    if (images && images.length > 0) {
      message = await this.createMessageWithImages(
        conversationId,
        senderId,
        content,
        messageType,
        images
      );
    } else {
      // Create message normally for text-only or with existing attachments
      message = new Message({
        conversation: conversationId,
        sender: senderId,
        content,
        messageType,
        attachments: attachmentIds,
      });

      await message.save();
    }

    return message;
  }

  /**
   * Create message with images (backward compatibility)
   */
  private async createMessageWithImages(
    conversationId: string,
    senderId: string | Types.ObjectId,
    content: string,
    messageType: string,
    images: string[]
  ): Promise<any> {
    // Create message with validation bypassed for now
    const message = new Message();
    message.conversation = conversationId as any;
    message.sender = senderId as any;
    message.content = content;
    message.messageType = messageType as any;
    message.attachments = [];

    // Save with validation disabled temporarily
    await message.save({ validateBeforeSave: false });

    const mediaIds = [];
    for (const imageUrl of images) {
      // Create Media object for each image URL
      const filename = imageUrl.split('/').pop() || 'image.jpg';
      const media = new Media({
        filename,
        originalName: filename,
        mimeType: 'image/jpeg', // Assume JPEG for uploaded images
        size: 0, // Unknown size for existing URLs
        url: imageUrl,
        storageKey: imageUrl.replace(
          'https://fullstack-hq-chat-app-bucket.s3.ap-southeast-1.amazonaws.com/',
          '',
        ),
        parentType: 'Message',
        parentId: message._id,
        usage: 'attachment',
        metadata: {
          alt: `Image attachment`,
        },
      });

      await media.save();
      mediaIds.push(media._id);
    }

    // Update message with media IDs and save with validation
    message.attachments = mediaIds;
    await message.save();

    return message;
  }

  /**
   * Update conversation after message creation
   */
  async updateConversationAfterMessage(
    conversation: any,
    updateData: ConversationUpdateData
  ): Promise<void> {
    const { messageId, senderId, participants } = updateData;

    // Update conversation
    conversation.lastMessage = messageId;
    conversation.lastMessageAt = new Date();

    // Update unread counts for all participants except sender
    participants.forEach((participantId: any) => {
      if (participantId.toString() !== senderId.toString()) {
        const currentUnread =
          conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(
          participantId.toString(),
          currentUnread + 1,
        );
      } else {
        conversation.unreadCount.set(participantId.toString(), 0);
        // Update sender's readAt timestamp
        conversation.readAt.set(senderId.toString(), new Date());
      }
    });

    await conversation.save();
  }

  /**
   * Create populated message response for API
   */
  async createMessageResponse(
    message: any,
    conversation: any,
    recipients: string[] = []
  ): Promise<any> {
    // Populate message for response
    const populatedMessage = await conversationService.getPopulatedMessage(
      message._id.toString(),
      true
    );

    if (!populatedMessage) {
      throw new Error('Failed to populate message');
    }

    // Add backward compatibility fields for frontend
    const responseMessage = {
      ...populatedMessage.toObject(),
      conversation: conversation._id,
      // For backward compatibility, add recipient field for direct messages
      ...(recipients.length === 1 &&
        !conversation.isGroup && {
          recipient: await this.getRecipientInfo(recipients[0]),
        }),
    };

    return responseMessage;
  }

  /**
   * Get recipient info for backward compatibility
   */
  private async getRecipientInfo(recipientId: string) {
    const userService = (await import('./userService.js')).default;
    return await userService.getUserInfo(recipientId);
  }

  /**
   * Get conversation messages with filtering
   */
  async getConversationMessages(
    conversationId: string,
    currentUserId: Types.ObjectId,
    isGroupConversation: boolean,
    options: {
      page?: number;
      limit?: number;
      before?: string;
    } = {}
  ) {
    const { limit = 50, before } = options;

    const messages = await conversationService.getConversationMessages(
      conversationId,
      Number(limit),
      before
    );

    // Filter out messages based on blocking relationships
    const finalFilteredMessages = await blockingService.filterMessagesForUser(
      messages,
      currentUserId,
      isGroupConversation
    );

    const hasMore = finalFilteredMessages.length === Number(limit);
    const nextCursor =
      finalFilteredMessages.length > 0
        ? finalFilteredMessages[
            finalFilteredMessages.length - 1
          ].createdAt.toISOString()
        : null;

    return {
      messages: finalFilteredMessages.reverse(), // Reverse to show oldest first
      pagination: {
        page: Number(options.page || 1),
        limit: Number(limit),
        hasMore,
        nextCursor: hasMore ? nextCursor : null,
      },
    };
  }

  /**
   * Update conversation read status
   */
  async markConversationAsRead(
    conversation: any,
    userId: Types.ObjectId
  ): Promise<void> {
    // Initialize readAt if it doesn't exist
    if (!conversation.readAt) {
      conversation.readAt = new Map();
    }

    // Update conversation read timestamp and unread count
    conversation.readAt.set(userId.toString(), new Date());
    conversation.unreadCount.set(userId.toString(), 0);
    await conversation.save();
  }
}

// Export singleton instance
export default new MessageService();