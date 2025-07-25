import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import InvitationToken from '../models/InvitationToken.js';
import { IUser } from '../types/index.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  conversation?: any;
  validatedEmails?: string[];
  newEmails?: string[];
  alreadyInvitedEmails?: string[];
}

/**
 * Validates email array format and email addresses
 */
export const validateInvitationEmails = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { emails } = req.body;

  // Check if emails array is provided and valid
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    res
      .status(400)
      .json({ message: 'Please provide at least one email address' });
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = emails.filter((email: string) => !emailRegex.test(email));
  
  if (invalidEmails.length > 0) {
    res.status(400).json({
      message: 'Invalid email addresses provided',
      invalidEmails,
    });
    return;
  }

  // Store validated emails for next middleware
  req.validatedEmails = emails.map((email: string) => email.toLowerCase());
  next();
};

/**
 * Checks if any emails belong to already registered users
 */
export const checkExistingUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const emails = req.validatedEmails!;

    // Check if any emails are already registered users
    const existingUsers = await User.find({
      email: { $in: emails },
    });

    if (existingUsers.length > 0) {
      const existingEmails = existingUsers.map((user) => user.email);
      res.status(400).json({
        message:
          'Some email addresses are already registered users. Please use the "Add people" feature instead.',
        existingEmails,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking existing users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Checks for existing unused invitations and filters out already invited emails
 */
export const checkExistingInvitations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    const emails = req.validatedEmails!;

    // Check for existing unused invitations
    const existingInvitations = await InvitationToken.find({
      email: { $in: emails },
      conversationId: conversationId,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    const alreadyInvitedEmails = existingInvitations.map(
      (invitation) => invitation.email,
    );
    
    const newEmails = emails.filter(
      (email) => !alreadyInvitedEmails.includes(email),
    );

    if (newEmails.length === 0) {
      res.status(400).json({
        message:
          'All provided email addresses already have pending invitations',
        alreadyInvitedEmails,
      });
      return;
    }

    // Store results for controller
    req.newEmails = newEmails;
    req.alreadyInvitedEmails = alreadyInvitedEmails;
    next();
  } catch (error) {
    console.error('Error checking existing invitations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};