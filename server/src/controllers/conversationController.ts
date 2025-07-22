import { Request, Response } from 'express';
import Conversation from '../models/Conversation.js';
import Media from '../models/Media.js';
import User from '../models/User.js';
import { uploadFile, deleteFile } from '../services/s3Service.js';
import WebSocketManager from '../config/websocket.js';
import { IUser } from '../types/index.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const getAllGroupConversations = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;

    if (!user || user.role !== 'superAdmin') {
      res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      return;
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter = { 
      isGroup: true,
      isActive: true 
    };

    // Get total count for pagination
    const total = await Conversation.countDocuments(filter);

    const groupConversations = await Conversation.find(filter)
    .populate({
      path: 'participants',
      select: 'firstName lastName userName email',
    })
    .populate({
      path: 'groupAdmin',
      select: 'firstName lastName userName email',
    })
    .populate({
      path: 'groupPhoto',
      match: { isDeleted: false },
      select: 'url filename originalName mimeType metadata',
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const conversationData = groupConversations.map(conversation => ({
      id: conversation._id.toString(),
      groupName: conversation.groupName,
      participants: conversation.participants.map((participant: any) => ({
        id: participant._id.toString(),
        firstName: participant.firstName,
        lastName: participant.lastName,
        userName: participant.userName,
        email: participant.email,
      })),
      groupAdmin: conversation.groupAdmin ? {
        id: (conversation.groupAdmin as any)._id.toString(),
        firstName: (conversation.groupAdmin as any).firstName,
        lastName: (conversation.groupAdmin as any).lastName,
        userName: (conversation.groupAdmin as any).userName,
        email: (conversation.groupAdmin as any).email,
      } : null,
      participantCount: conversation.participants.length,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({ 
      conversations: conversationData,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext,
        hasPrev
      }
    });
  } catch (error) {
    console.error('Error fetching group conversations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateGroupPhoto = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    if (!conversation.isGroup) {
      res.status(400).json({ message: 'Can only update group photos' });
      return;
    }

    if (conversation.groupAdmin?.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'Only group admin can update group photo' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }

    // Delete old group photo if exists
    if (conversation.groupPhoto) {
      const oldMedia = await Media.findById(conversation.groupPhoto);
      if (oldMedia) {
        await deleteFile(oldMedia.storageKey);
        await Media.findByIdAndDelete(oldMedia._id);
      }
    }

    // Upload new image to S3
    const uploadResult = await uploadFile(file);

    // Create media record
    const media = new Media({
      filename: uploadResult.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: uploadResult.url,
      storageKey: uploadResult.key,
      parentType: 'Conversation',
      parentId: conversation._id,
      usage: 'groupPhoto',
      metadata: {
        alt: `Group photo for ${conversation.groupName || 'group'}`,
      },
      isDeleted: false,
    });

    await media.save();

    // Update conversation with new group photo
    conversation.groupPhoto = media._id;
    await conversation.save();

    // Get user info for notifications
    const adminUser = await User.findById(user._id).select('firstName lastName userName');

    // Notify all participants via WebSocket
    conversation.participants.forEach((participantId: any) => {
      WebSocketManager.sendMessage(participantId.toString(), {
        type: 'group_photo_updated',
        conversationId: conversation._id,
        groupPhoto: {
          _id: media._id.toString(),
          url: media.url,
          filename: media.filename,
          originalName: media.originalName,
          mimeType: media.mimeType,
          metadata: media.metadata,
        },
        updatedBy: {
          userId: user._id.toString(),
          userName: adminUser?.userName,
          firstName: adminUser?.firstName,
          lastName: adminUser?.lastName,
        },
        updatedAt: new Date().toISOString(),
      });
    });

    res.json({
      message: 'Group photo updated successfully',
      groupPhoto: {
        id: media._id.toString(),
        url: media.url,
        filename: media.filename,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        metadata: media.metadata,
      },
    });
  } catch (error) {
    console.error('Error updating group photo:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};