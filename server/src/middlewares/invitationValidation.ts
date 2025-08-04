import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import InvitationToken from '../models/InvitationToken.js';
import { IUser } from '../types/index.js';
import { invitationEmailsSchema, invitationQuerySchema } from '../schemas/validations.js';
import { validateBody, validateQuery } from './zodValidation.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  conversation?: any;
  validatedEmails?: string[];
  newEmails?: string[];
  alreadyInvitedEmails?: string[];
}

/**
 * Validates email array format using Zod schema
 */
export const validateInvitationEmails = validateBody(invitationEmailsSchema);

/**
 * Checks if any emails belong to already registered users
 */
export const checkExistingUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { emails } = req.body;

    // Check if any emails are already registered users
    const existingUsers = await User.find({
      email: { $in: emails },
    });

    if (existingUsers.length > 0) {
      const existingEmails = existingUsers.map((user) => user.email);
      res.status(400).json({
        message: 'Some email addresses are already registered users. Please use the "Add people" feature instead.',
        errors: [{ field: 'emails', message: 'Some emails belong to existing users' }],
        existingEmails,
      });
      return;
    }

    // Store validated emails for next middleware (transform to lowercase was done by Zod)
    req.validatedEmails = emails;
    next();
  } catch (error) {
    console.error('Error checking existing users:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      errors: [{ field: 'server', message: 'Failed to check existing users' }],
    });
  }
};

/**
 * Checks for existing unused invitations and filters out already invited emails
 */
export const checkExistingInvitations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
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
        message: 'All provided email addresses already have pending invitations',
        errors: [{ field: 'emails', message: 'All emails have pending invitations' }],
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
    res.status(500).json({ 
      message: 'Internal server error',
      errors: [{ field: 'server', message: 'Failed to check existing invitations' }],
    });
  }
};

/**
 * Validates invitation token from query parameters
 */
export const validateInvitationQuery = validateQuery(invitationQuerySchema);