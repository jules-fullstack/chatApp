import { Request, Response, NextFunction } from 'express';
import Conversation from '../models/Conversation.js';
import { IUser, AuthenticatedRequest } from '../types/index.js';

// Using centralized AuthenticatedRequest from types/index.ts

/**
 * Middleware to validate message sending permissions for existing conversations
 */
export const requireMessagePermission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.body;
    const userId = req.user!._id;

    // Skip validation for new conversations (no conversationId)
    if (!conversationId) {
      return next();
    }

    // Find the conversation
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      res.status(404).json({
        message: 'Conversation not found',
      });
      return;
    }

    // Check if user is a participant in the conversation
    if (!conversation.participants.includes(userId)) {
      res.status(403).json({
        message: 'Not authorized to send message to this conversation',
      });
      return;
    }

    // Attach conversation to request for use in controller
    req.conversation = conversation;
    next();
  } catch (error) {
    console.error('Error in message permission middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};