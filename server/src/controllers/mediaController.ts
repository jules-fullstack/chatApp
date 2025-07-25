import { Request, Response } from 'express';
import multer from 'multer';
import { IUser } from '../types/index.js';
import mediaService from '../services/mediaService.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

interface AuthRequest extends Request {
  user?: IUser;
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
  targetMedia?: any;
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type') as any, false);
    }
  },
});

export const uploadMiddleware = upload.single('file');

export const uploadMedia = async (req: AuthRequest, res: Response) => {
  try {
    // All validations are now handled by middleware
    const { parentType, parentId, usage } = req.body;

    // Use mediaService to handle upload and database operations
    const media = await mediaService.createMediaFromFile({
      file: req.file!,
      parentType: parentType as any,
      parentId,
      usage: usage as any,
    });

    // Update parent model
    if (parentType === 'User' && usage === 'avatar') {
      await User.findByIdAndUpdate(parentId, { avatar: media._id });
    } else if (parentType === 'Message' && usage === 'messageAttachment') {
      await Message.findByIdAndUpdate(parentId, {
        $push: { attachments: media._id },
      });
    }

    res.status(201).json({
      success: true,
      media: {
        _id: media._id,
        url: media.url,
        filename: media.filename,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        metadata: media.metadata,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

export const deleteMedia = async (req: AuthRequest, res: Response) => {
  try {
    // Media existence and ownership validation handled by middleware
    const targetMedia = req.targetMedia;

    // Use mediaService for soft delete
    await mediaService.softDeleteMedia(targetMedia._id);

    // Remove from parent
    if (targetMedia.parentType === 'User' && targetMedia.usage === 'avatar') {
      await User.findByIdAndUpdate(targetMedia.parentId, { avatar: null });
    } else if (
      targetMedia.parentType === 'Message' &&
      targetMedia.usage === 'messageAttachment'
    ) {
      await Message.findByIdAndUpdate(targetMedia.parentId, {
        $pull: { attachments: targetMedia._id },
      });
    }

    res.json({ success: true, message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

export const getMediaByParent = async (req: Request, res: Response) => {
  try {
    // Parameter validation handled by middleware
    const { parentType, parentId } = req.params;
    const { usage } = req.query;

    // Use mediaService to get media
    const media = await mediaService.getMediaByParent(
      parentType as any,
      parentId,
      usage as any,
    );

    res.json({ success: true, media });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ success: false, message: 'Failed to get media' });
  }
};

// Image upload function for temporary/preview uploads
export const uploadImages = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    // File validation handled by middleware
    const files = req.files as Express.Multer.File[];
    const userId = req.user!._id;

    // Upload images as temporary files for User (for backward compatibility)
    const uploadedMedia: any[] = [];

    for (const file of files) {
      try {
        // Create media record using mediaService - using User as parent for temp uploads
        const media = await mediaService.createMediaFromFile({
          file,
          parentType: 'User',
          parentId: userId,
          usage: 'general',
        });

        uploadedMedia.push({
          url: media.url,
          id: media._id,
          filename: media.filename,
          originalName: media.originalName,
        });
      } catch (error) {
        console.error('Error uploading file:', file.originalname, error);
        throw new Error(`Failed to upload ${file.originalname}`);
      }
    }

    res.status(200).json({
      success: true,
      images: uploadedMedia.map((m) => m.url), // Backward compatibility
      media: uploadedMedia, // New format with more details
      count: uploadedMedia.length,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
};
