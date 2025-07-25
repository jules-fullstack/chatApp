import { Request, Response, NextFunction } from 'express';
import { IUser } from '../types/index.js';
import Media from '../models/Media.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
  targetMedia?: any;
}

/**
 * Middleware to validate that a file was uploaded
 */
export const validateFileUpload = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: 'No file provided' 
    });
  }
  next();
};

/**
 * Middleware to validate that multiple files were uploaded
 */
export const validateMultipleFiles = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ 
      error: 'No files provided' 
    });
  }
  next();
};

/**
 * Middleware to validate required media upload fields
 */
export const validateMediaUploadFields = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const { parentType, parentId, usage } = req.body;

  if (!parentType || !parentId || !usage) {
    return res.status(400).json({
      success: false,
      message: 'parentType, parentId, and usage are required',
    });
  }

  // Validate parentType enum
  const validParentTypes = ['User', 'Message', 'Conversation'];
  if (!validParentTypes.includes(parentType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid parentType. Must be User, Message, or Conversation',
    });
  }

  // Validate usage enum
  const validUsageTypes = ['avatar', 'groupPhoto', 'messageAttachment', 'general'];
  if (!validUsageTypes.includes(usage)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid usage. Must be avatar, groupPhoto, messageAttachment, or general',
    });
  }

  next();
};

/**
 * Middleware to validate parent entity exists
 */
export const validateParentExists = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { parentType, parentId } = req.body;

    if (parentType === 'User') {
      const user = await User.findById(parentId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
    } else if (parentType === 'Message') {
      const message = await Message.findById(parentId);
      if (!message) {
        return res.status(404).json({ 
          success: false, 
          message: 'Message not found' 
        });
      }
    }
    // Note: Conversation validation would go here if needed

    next();
  } catch (error) {
    console.error('Error validating parent exists:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Middleware to find and validate media exists (for delete operations)
 */
export const validateMediaExists = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { mediaId } = req.params;
    
    if (!mediaId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Media ID is required' 
      });
    }

    const media = await Media.findById(mediaId);
    if (!media) {
      return res.status(404).json({ 
        success: false, 
        message: 'Media not found' 
      });
    }

    // Attach media to request for use in controller
    req.targetMedia = media;
    next();
  } catch (error) {
    console.error('Error validating media exists:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Middleware to validate media ownership (optional - for enhanced security)
 */
export const validateMediaOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const media = req.targetMedia;
    const currentUser = req.user!;

    // For User-type media, ensure user owns it
    if (media.parentType === 'User' && media.parentId.toString() !== currentUser._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to access this media' 
      });
    }

    // For Message-type media, ensure user is sender (could be enhanced to check conversation membership)
    if (media.parentType === 'Message') {
      const message = await Message.findById(media.parentId);
      if (message && message.sender.toString() !== currentUser._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not authorized to access this media' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error validating media ownership:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Middleware to validate URL parameters for getMediaByParent
 */
export const validateGetMediaParams = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { parentType, parentId } = req.params;

  if (!parentType || !parentId) {
    return res.status(400).json({ 
      success: false, 
      message: 'parentType and parentId are required' 
    });
  }

  const validParentTypes = ['User', 'Message', 'Conversation'];
  if (!validParentTypes.includes(parentType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid parentType. Must be User, Message, or Conversation',
    });
  }

  next();
};