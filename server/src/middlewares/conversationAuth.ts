import { Request, Response, NextFunction } from 'express';
import Conversation from '../models/Conversation.js';
import { IUser } from '../types/index.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  conversation?: any;
}

/**
 * Middleware to verify user has access to a conversation (with superAdmin bypass)
 */
export const requireConversationAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!._id;
    const userRole = req.user?.role;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || (!conversation.participants.includes(userId) && userRole !== 'superAdmin')) {
      return res.status(403).json({
        message: 'Not authorized to access this conversation'
      });
    }

    // Attach conversation to request for controller reuse
    req.conversation = conversation;
    next();
  } catch (error) {
    console.error('Error in conversation auth middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};