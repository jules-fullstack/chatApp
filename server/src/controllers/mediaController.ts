import { Request, Response } from 'express';
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

    // Upload images in parallel using Promise.allSettled for better error handling
    const uploadPromises = files.map(async (file) => {
      try {
        // Create media record using mediaService - using User as parent for temp uploads
        const media = await mediaService.createMediaFromFile({
          file,
          parentType: 'User',
          parentId: userId,
          usage: 'general',
        });

        return {
          status: 'fulfilled' as const,
          value: {
            url: media.url,
            id: media._id,
            filename: media.filename,
            originalName: media.originalName,
          },
        };
      } catch (error) {
        console.error('Error uploading file:', file.originalname, error);
        return {
          status: 'rejected' as const,
          reason: `Failed to upload ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    });

    const results = await Promise.allSettled(uploadPromises);
    
    // Extract successful uploads and failed uploads
    const uploadedMedia: any[] = [];
    const failedUploads: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.status === 'fulfilled') {
        uploadedMedia.push(result.value.value);
      } else if (result.status === 'fulfilled' && result.value.status === 'rejected') {
        failedUploads.push(result.value.reason);
      } else if (result.status === 'rejected') {
        failedUploads.push(`Failed to upload ${files[index].originalname}: ${result.reason}`);
      }
    });

    // If all uploads failed, return error
    if (uploadedMedia.length === 0 && failedUploads.length > 0) {
      throw new Error(`All uploads failed: ${failedUploads.join(', ')}`);
    }

    // Return success response with partial failures info if any
    const response: any = {
      success: true,
      images: uploadedMedia.map((m) => m.url), // Backward compatibility
      media: uploadedMedia, // New format with more details
      count: uploadedMedia.length,
    };

    // Include failed uploads info if there were any partial failures
    if (failedUploads.length > 0) {
      response.partialFailures = failedUploads;
      response.totalAttempted = files.length;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
};
