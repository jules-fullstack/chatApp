import { Request, Response, NextFunction } from 'express';
import invitationService from '../services/invitationService.js';
import { IUser } from '../types/index.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  invitationToken?: string;
}

/**
 * Middleware to validate invitation token during registration
 */
export const validateInvitationToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { invitationToken, email } = req.body;

    // Skip validation if no invitation token provided
    if (!invitationToken) {
      return next();
    }

    const invitation = await invitationService.validateInvitationToken(
      invitationToken,
      email
    );

    if (!invitation) {
      return res.status(400).json({
        message: 'Invalid or expired invitation token',
      });
    }

    // Attach invitation token to request for use in controller
    req.invitationToken = invitationToken;
    next();
  } catch (error) {
    console.error('Error in invitation validation middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Middleware to validate invitation token for checking invitation info
 */
export const requireValidInvitationToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Invalid invitation token' });
    }

    const invitationInfo = await invitationService.getInvitationInfo(token);

    if (!invitationInfo) {
      return res.status(404).json({ message: 'Invalid or expired invitation' });
    }

    // Attach invitation info to request
    (req as any).invitationInfo = invitationInfo;
    next();
  } catch (error) {
    console.error('Error in invitation token validation middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};