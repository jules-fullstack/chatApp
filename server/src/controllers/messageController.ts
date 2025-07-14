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
    const { recipientId, content, messageType = 'text' } = req.body;
    const senderId = req.user?._id;

    if (!senderId || !recipientId || !content) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Create message
    const message = new Message({
      sender: senderId,
      recipient: recipientId,
      content,
      messageType,
    });

    await message.save();

    // Find or create conversation
    let conversation = await (Conversation as any).findBetweenUsers(
      senderId.toString(),
      recipientId,
    );

    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, recipientId],
        lastMessage: message._id,
        lastMessageAt: new Date(),
        unreadCount: new Map([
          [senderId.toString(), 0],
          [recipientId, 1],
        ]),
      });
    } else {
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();

      // Update unread count for recipient
      const currentUnread = conversation.unreadCount.get(recipientId) || 0;
      conversation.unreadCount.set(recipientId, currentUnread + 1);
      conversation.unreadCount.set(senderId.toString(), 0);
    }

    await conversation.save();

    // Populate message for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'firstName lastName userName')
      .populate('recipient', 'firstName lastName userName');

    WebSocketManager.sendMessageNotification(recipientId, populatedMessage);

    res.status(201).json({
      message: 'Message sent successfully',
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('sender', 'firstName lastName userName')
      .populate('recipient', 'firstName lastName userName');

    // Mark messages as read
    await Message.updateMany(
      { sender: userId, recipient: currentUserId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    // Update conversation unread count
    const conversation = await (Conversation as any).findBetweenUsers(
      currentUserId.toString(),
      userId,
    );
    if (conversation) {
      conversation.unreadCount.set(currentUserId.toString(), 0);
      await conversation.save();
    }

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
      const otherParticipant = conv.participants.find(
        (p: any) => p._id.toString() !== userId.toString(),
      );

      return {
        _id: conv._id,
        participant: otherParticipant,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount?.[userId.toString()] || 0,
      };
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
      isRead: true,
      readAt: new Date(),
    });

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
