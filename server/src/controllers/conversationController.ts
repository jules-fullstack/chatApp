import { Request, Response } from 'express';
import Conversation from '../models/Conversation.js';
import { IUser } from '../types/index.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const getAllGroupConversations = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;

    if (!user || user.role !== 'superAdmin') {
      res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      return;
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter = { 
      isGroup: true,
      isActive: true 
    };

    // Get total count for pagination
    const total = await Conversation.countDocuments(filter);

    const groupConversations = await Conversation.find(filter)
    .populate({
      path: 'participants',
      select: 'firstName lastName userName email',
    })
    .populate({
      path: 'groupAdmin',
      select: 'firstName lastName userName email',
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const conversationData = groupConversations.map(conversation => ({
      id: conversation._id.toString(),
      groupName: conversation.groupName,
      participants: conversation.participants.map((participant: any) => ({
        id: participant._id.toString(),
        firstName: participant.firstName,
        lastName: participant.lastName,
        userName: participant.userName,
        email: participant.email,
      })),
      groupAdmin: conversation.groupAdmin ? {
        id: (conversation.groupAdmin as any)._id.toString(),
        firstName: (conversation.groupAdmin as any).firstName,
        lastName: (conversation.groupAdmin as any).lastName,
        userName: (conversation.groupAdmin as any).userName,
        email: (conversation.groupAdmin as any).email,
      } : null,
      participantCount: conversation.participants.length,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({ 
      conversations: conversationData,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext,
        hasPrev
      }
    });
  } catch (error) {
    console.error('Error fetching group conversations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};