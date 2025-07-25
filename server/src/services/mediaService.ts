import Media from '../models/Media.js';
import { uploadFile, deleteFile } from './s3Service.js';
import { Types } from 'mongoose';

export type MediaUsage = 'avatar' | 'groupPhoto' | 'messageAttachment' | 'general';
export type ParentType = 'User' | 'Conversation' | 'Message';

export interface CreateMediaFromFileOptions {
  file: Express.Multer.File;
  parentType: ParentType;
  parentId: string | Types.ObjectId;
  usage: MediaUsage;
  metadata?: any;
  uploadResult?: any; // If file is already uploaded to S3
}

export interface CreateMediaFromUrlOptions {
  url: string;
  filename: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  storageKey?: string;
  parentType: ParentType;
  parentId: string | Types.ObjectId;
  usage: MediaUsage;
  metadata?: any;
}

export interface CreateDefaultMediaOptions {
  defaultUrl: string;
  filename: string;
  storageKey: string;
  parentType: ParentType;
  parentId: string | Types.ObjectId;
  usage: MediaUsage;
  metadata?: any;
}

class MediaService {
  /**
   * Create media record from uploaded file
   */
  async createMediaFromFile(options: CreateMediaFromFileOptions) {
    const { file, parentType, parentId, usage, metadata, uploadResult } = options;

    // Upload file to S3 if not already uploaded
    const upload = uploadResult || await uploadFile(file);

    // Generate metadata based on usage type
    const generatedMetadata = this.generateMetadata(usage, metadata, file.originalname, parentId);

    // Create media record
    const media = new Media({
      filename: upload.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: upload.url,
      storageKey: upload.key,
      parentType,
      parentId,
      usage,
      metadata: generatedMetadata,
      isDeleted: false,
    });

    await media.save();
    return media;
  }

  /**
   * Create media record from existing URL (for message attachments, etc.)
   */
  async createMediaFromUrl(options: CreateMediaFromUrlOptions) {
    const {
      url,
      filename,
      originalName = filename,
      mimeType = 'image/jpeg',
      size = 0,
      storageKey,
      parentType,
      parentId,
      usage,
      metadata
    } = options;

    // Generate storage key if not provided
    const finalStorageKey = storageKey || url.replace(
      'https://fullstack-hq-chat-app-bucket.s3.ap-southeast-1.amazonaws.com/',
      ''
    );

    // Generate metadata based on usage type
    const generatedMetadata = this.generateMetadata(usage, metadata, originalName, parentId);

    // Create media record
    const media = new Media({
      filename,
      originalName,
      mimeType,
      size,
      url,
      storageKey: finalStorageKey,
      parentType,
      parentId,
      usage,
      metadata: generatedMetadata,
      isDeleted: false,
    });

    await media.save();
    return media;
  }

  /**
   * Create default media record (like default avatar)
   */
  async createDefaultMedia(options: CreateDefaultMediaOptions) {
    const { defaultUrl, filename, storageKey, parentType, parentId, usage, metadata } = options;

    // Generate metadata based on usage type
    const generatedMetadata = this.generateMetadata(usage, metadata, filename, parentId);

    // Create media record
    const media = new Media({
      filename,
      originalName: filename,
      mimeType: 'image/jpeg',
      size: 0,
      url: defaultUrl,
      storageKey,
      parentType,
      parentId,
      usage,
      metadata: generatedMetadata,
      isDeleted: false,
    });

    await media.save();
    return media;
  }

  /**
   * Update media record (for replacing existing media)
   */
  async updateMedia(mediaId: string | Types.ObjectId, updates: Partial<any>) {
    return await Media.findByIdAndUpdate(mediaId, updates, { new: true });
  }

  /**
   * Delete media record and S3 file
   */
  async deleteMedia(mediaId: string | Types.ObjectId) {
    const media = await Media.findById(mediaId);
    if (!media) {
      throw new Error('Media not found');
    }

    // Delete from S3
    await deleteFile(media.storageKey);

    // Delete media record
    await Media.findByIdAndDelete(mediaId);
    
    return true;
  }

  /**
   * Soft delete media record
   */
  async softDeleteMedia(mediaId: string | Types.ObjectId) {
    return await Media.findByIdAndUpdate(
      mediaId,
      { isDeleted: true },
      { new: true }
    );
  }

  /**
   * Get media by parent
   */
  async getMediaByParent(parentType: ParentType, parentId: string | Types.ObjectId, usage?: MediaUsage) {
    const filter: any = {
      parentType,
      parentId,
      isDeleted: false,
    };

    if (usage) {
      filter.usage = usage;
    }

    return await Media.find(filter);
  }

  /**
   * Generate metadata based on usage type
   */
  private generateMetadata(
    usage: MediaUsage,
    customMetadata: any = {},
    filename?: string,
    parentId?: string | Types.ObjectId
  ) {
    const baseMetadata = { ...customMetadata };

    switch (usage) {
      case 'avatar':
        return {
          ...baseMetadata,
          alt: `Avatar for user ${parentId}`,
        };

      case 'groupPhoto':
        return {
          ...baseMetadata,
          alt: `Group photo for ${baseMetadata.groupName || 'group'}`,
        };

      case 'messageAttachment':
        return {
          ...baseMetadata,
          alt: filename || 'Message attachment',
        };

      default:
        return baseMetadata;
    }
  }

  /**
   * Create group photo specifically
   */
  async createGroupPhoto(
    file: Express.Multer.File,
    conversationId: string | Types.ObjectId,
    groupName?: string
  ) {
    return await this.createMediaFromFile({
      file,
      parentType: 'Conversation',
      parentId: conversationId,
      usage: 'groupPhoto',
      metadata: { groupName },
    });
  }

  /**
   * Create default avatar specifically
   */
  async createDefaultAvatar(userId: string | Types.ObjectId) {
    const defaultAvatarUrl = 'https://fullstack-hq-chat-app-bucket.s3.ap-southeast-1.amazonaws.com/images/default-avatars/default-avatar.jpg';
    
    return await this.createDefaultMedia({
      defaultUrl: defaultAvatarUrl,
      filename: 'default-avatar.jpg',
      storageKey: 'images/default-avatars/default-avatar.jpg',
      parentType: 'User',
      parentId: userId,
      usage: 'avatar',
      metadata: {
        width: 400,
        height: 400,
        alt: 'Default avatar',
      },
    });
  }

  /**
   * Create message attachment from URL
   */
  async createMessageAttachment(
    imageUrl: string,
    messageId: string | Types.ObjectId
  ) {
    const filename = imageUrl.split('/').pop() || 'image.jpg';
    
    return await this.createMediaFromUrl({
      url: imageUrl,
      filename,
      originalName: filename,
      parentType: 'Message',
      parentId: messageId,
      usage: 'messageAttachment',
    });
  }
}

// Export singleton instance
export default new MediaService();