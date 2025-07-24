import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction, RequestHandler } from 'express';

const validationMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  next();
};

const validateRequestStructure: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { recipientIds, conversationId, content, attachmentIds, images } =
    req.body;

  if (!conversationId && !recipientIds) {
    res
      .status(400)
      .json({ message: 'Must specify either conversationId or recipientIds' });
    return;
  }

  if (conversationId && recipientIds) {
    res
      .status(400)
      .json({ message: 'Cannot specify both conversationId and recipientIds' });
    return;
  }

  const hasContent = content && content.trim();
  const hasAttachments =
    (attachmentIds && attachmentIds.length > 0) ||
    (images && images.length > 0);

  if (!hasContent && !hasAttachments) {
    res.status(400).json({
      message: 'Must have either content or attachments',
    });
    return;
  }

  next();
};

const normalizeRecipients: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { recipientIds } = req.body;

  if (recipientIds) {
    req.body.recipients = Array.isArray(recipientIds)
      ? recipientIds
      : [recipientIds];

    if (req.body.recipients.length === 0) {
      res.status(400).json({ message: 'Recipients array cannot be empty' });
      return;
    }

    req.body.recipients = [...new Set(req.body.recipients)];
  }

  next();
};

export const validateMessageContent: (ValidationChain | RequestHandler)[] = [
  body('content')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message content must be no more than 2000 characters'),

  body('messageType')
    .optional()
    .isIn(['text', 'image'])
    .withMessage('Message type must be either text or image'),

  body('recipientIds')
    .optional()
    .custom((value) => {
      if (value && !Array.isArray(value) && typeof value !== 'string') {
        throw new Error('Recipients must be string or array of strings');
      }
      return true;
    }),

  body('conversationId')
    .optional()
    .isMongoId()
    .withMessage('Conversation ID must be a valid MongoDB ObjectId'),

  body('attachmentIds')
    .optional()
    .isArray()
    .withMessage('Attachment IDs must be an array'),

  body('attachmentIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each attachment ID must be a valid MongoDB ObjectId'),

  body('images').optional().isArray().withMessage('Images must be an array'),

  body('groupName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Group name must be no more than 100 characters'),
  validationMiddleware,
];

export const validateSendMessage: RequestHandler[] = [
  validateRequestStructure,
  normalizeRecipients,
  ...validateMessageContent,
];
