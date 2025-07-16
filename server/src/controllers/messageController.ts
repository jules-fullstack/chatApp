import { Request, Response } from 'express';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { IUser } from '../types/index.js';
import WebSocketManager from '../config/websocket.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipientIds, conversationId, content, messageType = 'text' } = req.body;
    const senderId = req.user?._id;

    if (!senderId || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let conversation;
    let recipients = [];

    if (conversationId) {
      // Existing conversation
      conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(senderId)) {
        return res.status(403).json({ message: 'Not authorized to send message to this conversation' });
      }
      
      // Get all participants except sender for notifications
      recipients = conversation.participants
        .map(p => p.toString())
        .filter(p => p !== senderId.toString());
    } else {
      // New message - support both single recipient (legacy) and multiple recipients
      if (recipientIds) {
        recipients = Array.isArray(recipientIds) ? recipientIds : [recipientIds];
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
        return res.status(404).json({ message: 'One or more recipients not found' });
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
          });
          await conversation.save();
        }
      } else {
        // Group message - create new group conversation
        const allParticipants = [senderId.toString(), ...recipients];
        
        // Generate group name from usernames
        const participantUsers = await User.find({ 
          _id: { $in: recipients } 
        }).select('userName');
        const groupName = participantUsers.map(u => u.userName).join(', ');

        conversation = await (Conversation as any).createGroup(
          allParticipants,
          groupName,
          senderId.toString(),
        );
        
        // Initialize unread counts for all participants
        const unreadCount = new Map();
        allParticipants.forEach(participantId => {
          unreadCount.set(participantId, participantId === senderId.toString() ? 0 : 0);
        });
        conversation.unreadCount = unreadCount;
        await conversation.save();
      }
    }

    // Create message
    const message = new Message({
      conversation: conversation._id,
      sender: senderId,
      content,
      messageType,
      readBy: new Map([[senderId.toString(), new Date()]]),
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();

    // Update unread counts for all participants except sender
    conversation.participants.forEach((participantId: any) => {
      if (participantId.toString() !== senderId.toString()) {
        const currentUnread = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentUnread + 1);
      } else {
        conversation.unreadCount.set(participantId.toString(), 0);
      }
    });

    await conversation.save();

    // Populate message for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'firstName lastName userName')
      .populate('conversation');

    // Add backward compatibility fields for frontend
    const responseMessage = {
      ...populatedMessage.toObject(),
      conversation: conversation._id,
      // For backward compatibility, add recipient field for direct messages
      ...(recipients.length === 1 && !conversation.isGroup && {
        recipient: await User.findById(recipients[0]).select('firstName lastName userName')
      })
    };

    // Send WebSocket notification to all participants except sender
    conversation.participants.forEach((participantId: any) => {
      if (participantId.toString() !== senderId.toString()) {
        WebSocketManager.sendMessageNotification(participantId.toString(), responseMessage);
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
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const messages = await Message.find({
      conversation: conversationId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('sender', 'firstName lastName userName');

    // Mark messages as read for current user
    const messageIds = messages.map(m => m._id);
    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { [`readBy.${currentUserId}`]: new Date() } }
    );

    // Update conversation unread count
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
export const getDirectMessages = async (req: AuthenticatedRequest, res: Response) => {
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
      .populate('lastMessage')
      .lean();

    const formattedConversations = conversations.map((conv) => {
      if (conv.isGroup) {
        // For group conversations
        return {
          _id: conv._id,
          isGroup: true,
          groupName: conv.groupName,
          participants: conv.participants,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount?.[userId.toString()] || 0,
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
    const { messageId } = req.params;
    const userId = req.user?._id;

    await Message.findByIdAndUpdate(messageId, {
      $set: { [`readBy.${userId}`]: new Date() }
    });

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};