import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { IUser } from '../types/index.js';
import Media from '../models/Media.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import {
  mediaUploadSchema,
  mediaParamsSchema,
  mediaIdSchema,
} from '../schemas/validations.js';
import {
  validateBody,
  validateParams,
  validateFiles,
} from './zodValidation.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
  targetMedia?: any;
}

// File validation constants
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type') as any, false);
    }
  },
});

export const uploadMiddleware = upload.single('file');

/**
 * Middleware to validate that a file was uploaded
 */
export const validateFileUpload = validateFiles({
  required: true,
  maxFiles: 1,
  maxSize: MAX_FILE_SIZE,
  allowedMimes: ALLOWED_MIME_TYPES,
});

/**
 * Middleware to validate that multiple files were uploaded
 */
export const validateMultipleFiles = validateFiles({
  required: true,
  maxFiles: 10,
  maxSize: MAX_FILE_SIZE,
  allowedMimes: ALLOWED_MIME_TYPES,
});

/**
 * Middleware to validate required media upload fields
 */
export const validateMediaUploadFields = validateBody(mediaUploadSchema);

/**
 * Middleware to validate parent entity exists
 */
export const validateParentExists = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { parentType, parentId } = req.body;

    if (parentType === 'User') {
      const user = await User.findById(parentId);
      if (!user) {
        res.status(404).json({
          message: 'Validation error',
          errors: [{ field: 'parentId', message: 'User not found' }],
        });
        return;
      }
    } else if (parentType === 'Message') {
      const message = await Message.findById(parentId);
      if (!message) {
        res.status(404).json({
          message: 'Validation error',
          errors: [{ field: 'parentId', message: 'Message not found' }],
        });
        return;
      }
    }
    // Note: Conversation validation would go here if needed

    next();
  } catch (error) {
    console.error('Error validating parent exists:', error);
    res.status(500).json({
      message: 'Internal server error',
      errors: [
        { field: 'server', message: 'Failed to validate parent entity' },
      ],
    });
  }
};

/**
 * Middleware to find and validate media exists (for delete operations)
 */
export const validateMediaExists = [
  validateParams(mediaIdSchema),
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { mediaId } = req.params;

      const media = await Media.findById(mediaId);
      if (!media) {
        res.status(404).json({
          message: 'Validation error',
          errors: [{ field: 'mediaId', message: 'Media not found' }],
        });
        return;
      }

      // Attach media to request for use in controller
      req.targetMedia = media;
      next();
    } catch (error) {
      console.error('Error validating media exists:', error);
      res.status(500).json({
        message: 'Internal server error',
        errors: [
          { field: 'server', message: 'Failed to validate media exists' },
        ],
      });
    }
  },
];

/**
 * Middleware to validate media ownership (optional - for enhanced security)
 */
export const validateMediaOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const media = req.targetMedia;
    const currentUser = req.user!;

    // For User-type media, ensure user owns it
    if (
      media.parentType === 'User' &&
      media.parentId.toString() !== currentUser._id.toString()
    ) {
      res.status(403).json({
        message: 'Authorization error',
        errors: [
          { field: 'mediaId', message: 'Not authorized to access this media' },
        ],
      });
      return;
    }

    // For Message-type media, ensure user is sender (could be enhanced to check conversation membership)
    if (media.parentType === 'Message') {
      const message = await Message.findById(media.parentId);
      if (message && message.sender.toString() !== currentUser._id.toString()) {
        res.status(403).json({
          message: 'Authorization error',
          errors: [
            {
              field: 'mediaId',
              message: 'Not authorized to access this media',
            },
          ],
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Error validating media ownership:', error);
    res.status(500).json({
      message: 'Internal server error',
      errors: [
        { field: 'server', message: 'Failed to validate media ownership' },
      ],
    });
  }
};

/**
 * Middleware to validate URL parameters for getMediaByParent
 */
export const validateGetMediaParams = validateParams(mediaParamsSchema);
