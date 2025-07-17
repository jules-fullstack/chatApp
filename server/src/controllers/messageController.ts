import { Request, Response } from 'express';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { IUser } from '../types/index.js';
import WebSocketManager from '../config/websocket.js';
import { migrateConversationsToReadAt } from '../utils/migrateConversations.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      recipientIds,
      conversationId,
      content,
      messageType = 'text',
      groupName,
    } = req.body;
    const senderId = req.user?._id;

    if (!senderId || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let conversation: any;
    let recipients: string[] = [];

    if (conversationId) {
      // Existing conversation
      conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(senderId)) {
        return res.status(403).json({
          message: 'Not authorized to send message to this conversation',
        });
      }

      // Get all participants except sender for notifications
      recipients = conversation.participants
        .map((p: any) => p.toString())
        .filter((p: string) => p !== senderId.toString());
    } else {
      // New message - support both single recipient (legacy) and multiple recipients
      if (recipientIds) {
        recipients = Array.isArray(recipientIds)
          ? recipientIds
          : [recipientIds];
      } else if (req.body.recipientId) {
        // Legacy support
        recipients = [req.body.recipientId];
      }

      if (recipients.length === 0) {
        return res.status(400).json({ message: 'No recipients specified' });
      }
    }

    if (!conversationId) {
      // Only check recipients if this is a new message
      const recipientUsers = await User.find({ _id: { $in: recipients } });
      if (recipientUsers.length !== recipients.length) {
        return res
          .status(404)
          .json({ message: 'One or more recipients not found' });
      }

      if (recipients.length === 1) {
        // Direct message - find or create conversation
        conversation = await (Conversation as any).findBetweenUsers(
          senderId.toString(),
          recipients[0],
        );

        if (!conversation) {
          conversation = new Conversation({
            participants: [senderId, recipients[0]],
            isGroup: false,
            lastMessageAt: new Date(),
            unreadCount: new Map([
              [senderId.toString(), 0],
              [recipients[0], 0],
            ]),
            readAt: new Map([
              [senderId.toString(), new Date()],
              [recipients[0], new Date(0)], // Initialize with epoch for new conversations
            ]),
          });
          await conversation.save();
        }
      } else {
        // Group message - create new group conversation
        const allParticipants = [senderId.toString(), ...recipients];

        // Use provided group name or set to null if not provided
        let finalGroupName =
          groupName && groupName.trim() ? groupName.trim() : null;

        conversation = await (Conversation as any).createGroup(
          allParticipants,
          finalGroupName,
          senderId.toString(),
        );

        // Initialize unread counts and readAt for all participants
        const unreadCount = new Map();
        const readAt = new Map();
        allParticipants.forEach((participantId) => {
          unreadCount.set(
            participantId,
            participantId === senderId.toString() ? 0 : 0,
          );
          readAt.set(
            participantId,
            participantId === senderId.toString() ? new Date() : new Date(0),
          );
        });
        conversation.unreadCount = unreadCount;
        conversation.readAt = readAt;
        await conversation.save();
      }
    }

    // Create message
    const message = new Message({
      conversation: conversation._id,
      sender: senderId,
      content,
      messageType,
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();

    // Update unread counts for all participants except sender
    conversation.participants.forEach((participantId: any) => {
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

    // Populate message for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'firstName lastName userName')
      .populate('conversation');

    if (!populatedMessage) {
      return res.status(500).json({ message: 'Failed to create message' });
    }

    // Add backward compatibility fields for frontend
    const responseMessage = {
      ...populatedMessage.toObject(),
      conversation: conversation._id,
      // For backward compatibility, add recipient field for direct messages
      ...(recipients.length === 1 &&
        !conversation.isGroup && {
          recipient: await User.findById(recipients[0]).select(
            'firstName lastName userName',
          ),
        }),
    };

    // Send WebSocket notification to all participants except sender
    conversation.participants.forEach((participantId: any) => {
      if (participantId.toString() !== senderId.toString()) {
        WebSocketManager.sendMessageNotification(
          participantId.toString(),
          responseMessage,
        );
      }
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: responseMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user is participant in conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(currentUserId)) {
      return res
        .status(403)
        .json({ message: 'Not authorized to view this conversation' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const messages = await Message.find({
      conversation: conversationId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('sender', 'firstName lastName userName');

    // Initialize readAt if it doesn't exist
    if (!conversation.readAt) {
      conversation.readAt = new Map();
    }

    // Update conversation read timestamp and unread count
    conversation.readAt.set(currentUserId.toString(), new Date());
    conversation.unreadCount.set(currentUserId.toString(), 0);
    await conversation.save();

    res.json({
      messages: messages.reverse(),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        hasMore: messages.length === Number(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Legacy endpoint for direct messages - for backward compatibility
export const getDirectMessages = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find direct conversation between users
    const conversation = await (Conversation as any).findBetweenUsers(
      currentUserId.toString(),
      userId,
    );

    if (!conversation) {
      return res.json({ messages: [] });
    }

    // Use the main getMessages logic
    req.params.conversationId = conversation._id.toString();
    return getMessages(req, res);
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getConversations = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'firstName lastName userName')
      .populate('groupAdmin', 'firstName lastName userName')
      .populate('lastMessage')
      .lean();

    const formattedConversations = conversations.map((conv) => {
      // Convert readAt Map to object for JSON serialization
      const readAtObject: Record<string, string> = {};

      try {
        if (conv.readAt && conv.readAt instanceof Map) {
          // Handle Map objects (when not using .lean())
          for (const [key, value] of conv.readAt) {
            readAtObject[key] = value.toISOString();
          }
        } else if (conv.readAt && typeof conv.readAt === 'object') {
          // Handle plain objects (when using .lean())
          for (const [key, value] of Object.entries(conv.readAt)) {
            if (value instanceof Date) {
              readAtObject[key] = value.toISOString();
            } else if (typeof value === 'string') {
              readAtObject[key] = value;
            }
          }
        }
        // If readAt doesn't exist or is invalid, readAtObject remains empty
      } catch (error) {
        console.error(
          'Error processing readAt for conversation:',
          conv._id,
          error,
        );
        // readAtObject remains empty object
      }

      if (conv.isGroup) {
        // For group conversations
        return {
          _id: conv._id,
          isGroup: true,
          groupName: conv.groupName,
          groupAdmin: conv.groupAdmin,
          participants: conv.participants,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount?.[userId.toString()] || 0,
          readAt: readAtObject,
        };
      } else {
        // For direct conversations - maintain backward compatibility
        const otherParticipant = conv.participants.find(
          (p: any) => p._id.toString() !== userId.toString(),
        );

        return {
          _id: conv._id,
          isGroup: false,
          participant: otherParticipant,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount?.[userId.toString()] || 0,
          readAt: readAtObject,
        };
      }
    });

    res.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find and update the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ message: 'Not authorized to mark conversation as read' });
    }

    // Initialize readAt if it doesn't exist
    if (!conversation.readAt) {
      conversation.readAt = new Map();
    }

    // Update conversation read timestamp and unread count
    conversation.readAt.set(userId.toString(), new Date());
    conversation.unreadCount.set(userId.toString(), 0);
    await conversation.save();

    // Notify other participants via WebSocket
    const otherParticipants = conversation.participants.filter(
      (p) => p.toString() !== userId.toString(),
    );

    // Get user info for notifications
    const user = await User.findById(userId).select(
      'firstName lastName userName',
    );

    otherParticipants.forEach((participantId) => {
      WebSocketManager.sendMessage(participantId.toString(), {
        type: 'conversation_read',
        conversationId: conversation._id,
        readBy: {
          userId: userId.toString(),
          userName: user?.userName,
          firstName: user?.firstName,
          lastName: user?.lastName,
        },
        readAt: conversation.readAt.get(userId.toString()),
        isGroup: conversation.isGroup,
      });
    });

    res.json({
      message: 'Conversation marked as read',
      readAt: conversation.readAt.get(userId.toString()),
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateGroupName = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { conversationId } = req.params;
    const { groupName } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find the conversation and verify it's a group conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ message: 'Not authorized to update this conversation' });
    }

    if (!conversation.isGroup) {
      return res
        .status(400)
        .json({ message: 'Cannot update name of direct message conversation' });
    }

    // Update the group name (allow empty string to remove name)
    const trimmedGroupName = groupName?.trim() || null;
    conversation.groupName = trimmedGroupName;
    await conversation.save();

    // Get updated conversation with populated participants
    const updatedConversation = await Conversation.findById(conversationId)
      .populate('participants', 'firstName lastName userName')
      .populate('groupAdmin', 'firstName lastName userName')
      .lean();

    // Notify all participants via WebSocket
    const user = await User.findById(userId).select(
      'firstName lastName userName',
    );

    conversation.participants.forEach((participantId: any) => {
      WebSocketManager.sendMessage(participantId.toString(), {
        type: 'group_name_updated',
        conversationId: conversation._id,
        groupName: trimmedGroupName,
        updatedBy: {
          userId: userId.toString(),
          userName: user?.userName,
          firstName: user?.firstName,
          lastName: user?.lastName,
        },
        conversation: updatedConversation,
      });
    });

    res.json({
      message: 'Group name updated successfully',
      groupName: trimmedGroupName,
    });
  } catch (error) {
    console.error('Error updating group name:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const leaveGroup = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Find the conversation and verify it's a group conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ message: 'Not authorized to leave this conversation' });
    }

    if (!conversation.isGroup) {
      return res
        .status(400)
        .json({ message: 'Cannot leave a direct message conversation' });
    }

    // Remove user from participants
    conversation.participants = conversation.participants.filter(
      (participant: any) => participant.toString() !== userId.toString()
    );

    // Remove user from unread counts and readAt
    conversation.unreadCount.delete(userId.toString());
    conversation.readAt.delete(userId.toString());

    // If the user was the admin, assign a new admin randomly
    if (conversation.groupAdmin?.toString() === userId.toString()) {
      if (conversation.participants.length > 0) {
        const randomIndex = Math.floor(Math.random() * conversation.participants.length);
        conversation.groupAdmin = conversation.participants[randomIndex];
      } else {
        // If no participants left, mark conversation as inactive
        conversation.isActive = false;
      }
    }

    await conversation.save();

    // Get user info for notifications
    const user = await User.findById(userId).select(
      'firstName lastName userName',
    );

    // Notify remaining participants via WebSocket
    conversation.participants.forEach((participantId: any) => {
      WebSocketManager.sendMessage(participantId.toString(), {
        type: 'user_left_group',
        conversationId: conversation._id,
        leftUser: {
          userId: userId.toString(),
          userName: user?.userName,
          firstName: user?.firstName,
          lastName: user?.lastName,
        },
        newAdmin: conversation.groupAdmin?.toString(),
        isActive: conversation.isActive,
      });
    });

    res.json({
      message: 'Left group successfully',
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Migration endpoint - remove this after migration is complete
export const migrateConversations = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await migrateConversationsToReadAt();
    res.json(result);
  } catch (error) {
    console.error('Migration endpoint error:', error);
    res.status(500).json({ message: 'Migration failed' });
  }
};
