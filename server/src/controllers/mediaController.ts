import { Request, Response } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import Media from '../models/Media.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { IUser } from '../types/index.js';

interface AuthRequest extends Request {
  user?: IUser;
  file?: Express.Multer.File;
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'fullstack-hq-chat-app-bucket';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
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
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { parentType, parentId, usage } = req.body;

    if (!parentType || !parentId || !usage) {
      return res.status(400).json({ 
        success: false, 
        message: 'parentType, parentId, and usage are required' 
      });
    }

    // Validate parent exists
    if (parentType === 'User') {
      const user = await User.findById(parentId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
    } else if (parentType === 'Message') {
      const message = await Message.findById(parentId);
      if (!message) {
        return res.status(404).json({ success: false, message: 'Message not found' });
      }
    }

    const fileId = uuidv4();
    const fileExtension = req.file.originalname.split('.').pop();
    const filename = `${usage}/${parentType.toLowerCase()}/${parentId}/${fileId}.${fileExtension}`;
    
    let processedBuffer = req.file.buffer;
    let metadata: any = {};

    // Process images
    if (req.file.mimetype.startsWith('image/')) {
      const image = sharp(req.file.buffer);
      const imageMetadata = await image.metadata();
      
      metadata.width = imageMetadata.width;
      metadata.height = imageMetadata.height;

      // Optimize images
      if (usage === 'avatar') {
        processedBuffer = await image
          .resize(400, 400, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toBuffer();
      } else {
        processedBuffer = await image
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer();
      }
    }

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: processedBuffer,
      ContentType: req.file.mimetype,
      Metadata: {
        originalName: req.file.originalname,
        uploadedBy: req.user.id,
        parentType,
        parentId,
        usage,
      },
    });

    await s3Client.send(uploadCommand);

    const url = `https://${BUCKET_NAME}.s3.ap-southeast-1.amazonaws.com/${filename}`;

    // Create Media record
    const media = new Media({
      filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: processedBuffer.length,
      url,
      storageKey: filename,
      parentType,
      parentId,
      usage,
      metadata,
    });

    await media.save();

    // Update parent model
    if (parentType === 'User' && usage === 'avatar') {
      await User.findByIdAndUpdate(parentId, { avatar: media._id });
    } else if (parentType === 'Message' && usage === 'attachment') {
      await Message.findByIdAndUpdate(parentId, {
        $push: { attachments: media._id }
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
    const { mediaId } = req.params;

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const media = await Media.findById(mediaId);
    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    // Soft delete
    media.isDeleted = true;
    await media.save();

    // Remove from parent
    if (media.parentType === 'User' && media.usage === 'avatar') {
      await User.findByIdAndUpdate(media.parentId, { avatar: null });
    } else if (media.parentType === 'Message' && media.usage === 'attachment') {
      await Message.findByIdAndUpdate(media.parentId, {
        $pull: { attachments: media._id }
      });
    }

    // Optionally delete from S3 (uncomment if desired)
    // const deleteCommand = new DeleteObjectCommand({
    //   Bucket: BUCKET_NAME,
    //   Key: media.storageKey,
    // });
    // await s3Client.send(deleteCommand);

    res.json({ success: true, message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

export const getMediaByParent = async (req: Request, res: Response) => {
  try {
    const { parentType, parentId } = req.params;
    const { usage } = req.query;

    const filter: any = {
      parentType,
      parentId,
      isDeleted: false,
    };

    if (usage) {
      filter.usage = usage;
    }

    const media = await Media.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, media });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ success: false, message: 'Failed to get media' });
  }
};