import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction, RequestHandler } from 'express';

const validationMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
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

export const validateMessageContent: (ValidationChain | RequestHandler)[] = [
  body('content')
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message content must be no more than 2000 characters')
    .custom((value, { req }) => {
      // Allow empty content if images are provided
      const images = req.body.images;
      if (!value && (!images || images.length === 0)) {
        throw new Error('Message must have either content or images');
      }
      return true;
    }),
  validationMiddleware,
];