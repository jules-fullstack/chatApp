import { Request, Response, NextFunction } from 'express';
import { messageContentSchema } from '../schemas/validations.js';
import { validateBody } from './zodValidation.js';

/**
 * Custom middleware to validate request structure and normalize recipients
 */
export const validateMessageStructure = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { recipientIds, conversationId, content, attachmentIds, images } = req.body;

  // Check mutual exclusivity of conversationId and recipientIds
  if (!conversationId && !recipientIds) {
    res.status(400).json({
      message: 'Validation error',
      errors: [{ field: 'conversationId', message: 'Must specify either conversationId or recipientIds' }],
    });
    return;
  }

  if (conversationId && recipientIds) {
    res.status(400).json({
      message: 'Validation error',
      errors: [{ field: 'conversationId', message: 'Cannot specify both conversationId and recipientIds' }],
    });
    return;
  }

  // Check that there's either content or attachments
  const hasContent = content && content.trim();
  const hasAttachments =
    (attachmentIds && attachmentIds.length > 0) ||
    (images && images.length > 0);

  if (!hasContent && !hasAttachments) {
    res.status(400).json({
      message: 'Validation error',
      errors: [{ field: 'content', message: 'Must have either content or attachments' }],
    });
    return;
  }

  next();
};

/**
 * Normalize recipients array from recipientIds
 */
export const normalizeRecipients = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { recipientIds } = req.body;

  if (recipientIds) {
    // Convert to array if it's a single string
    req.body.recipients = Array.isArray(recipientIds)
      ? recipientIds
      : [recipientIds];

    // Check if recipients array is empty
    if (req.body.recipients.length === 0) {
      res.status(400).json({
        message: 'Validation error',
        errors: [{ field: 'recipientIds', message: 'Recipients array cannot be empty' }],
      });
      return;
    }

    // Remove duplicates
    req.body.recipients = [...new Set(req.body.recipients)];
  }

  next();
};

/**
 * Combined validation middleware for message sending
 */
export const validateSendMessage = [
  validateBody(messageContentSchema),
  validateMessageStructure,
  normalizeRecipients,
];

/**
 * Basic message content validation (for simple scenarios)
 */
export const validateMessageContent = validateBody(messageContentSchema);