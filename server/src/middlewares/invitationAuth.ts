import { Request, Response, NextFunction } from 'express';
import invitationService from '../services/invitationService.js';
import { IUser } from '../types/index.js';
import {
  invitationTokenSchema,
  invitationQuerySchema,
} from '../schemas/validations.js';
import { validateQuery } from './zodValidation.js';

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
  next: NextFunction,
): Promise<void> => {
  try {
    const { invitationToken, email } = req.body;

    // Skip validation if no invitation token provided
    if (!invitationToken) {
      next();
      return;
    }

    // Validate token format first
    const tokenValidation = invitationTokenSchema.safeParse({
      invitationToken,
      email,
    });
    if (!tokenValidation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: tokenValidation.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const invitation = await invitationService.validateInvitationToken(
      invitationToken,
      email,
    );

    if (!invitation) {
      res.status(400).json({
        message: 'Validation error',
        errors: [
          {
            field: 'invitationToken',
            message: 'Invalid or expired invitation token',
          },
        ],
      });
      return;
    }

    // Attach invitation token to request for use in controller
    req.invitationToken = invitationToken;
    next();
  } catch (error) {
    console.error('Error in invitation validation middleware:', error);
    res.status(500).json({
      message: 'Internal server error',
      errors: [
        { field: 'server', message: 'Failed to validate invitation token' },
      ],
    });
  }
};

/**
 * Middleware to validate invitation token for checking invitation info
 */
export const requireValidInvitationToken = [
  validateQuery(invitationQuerySchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = (req as any).validatedQuery;

      const invitationInfo = await invitationService.getInvitationInfo(
        token as string,
      );

      if (!invitationInfo) {
        res.status(404).json({
          message: 'Validation error',
          errors: [
            { field: 'token', message: 'Invalid or expired invitation' },
          ],
        });
        return;
      }

      // Attach invitation info to request
      (req as any).invitationInfo = invitationInfo;
      next();
    } catch (error) {
      console.error('Error in invitation token validation middleware:', error);
      res.status(500).json({
        message: 'Internal server error',
        errors: [
          { field: 'server', message: 'Failed to validate invitation token' },
        ],
      });
    }
  },
];
