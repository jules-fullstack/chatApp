import { Request, Response } from 'express';
import Conversation from '../models/Conversation.js';
import Media from '../models/Media.js';
import User from '../models/User.js';
import InvitationToken from '../models/InvitationToken.js';
import { uploadFile, deleteFile } from '../services/s3Service.js';
import { sendInvitationEmail } from '../services/emailService.js';
import WebSocketManager from '../config/websocket.js';
import { IUser } from '../types/index.js';
import { GroupEventService } from '../services/groupEventService.js';
import conversationService from '../services/conversationService.js';
import userService from '../services/userService.js';
import notificationService from '../services/notificationService.js';
import messageService from '../services/messageService.js';
import crypto from 'crypto';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  conversation?: any;
}

export const getAllGroupConversations = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user;

    if (!user || user.role !== 'superAdmin') {
      res
        .status(403)
        .json({ message: 'Access denied. Admin privileges required.' });
      return;
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      isGroup: true,
      isActive: true,
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

    const conversationData = groupConversations.map((conversation) => ({
      id: conversation._id.toString(),
      groupName: conversation.groupName,
      participants: conversation.participants.map((participant: any) => ({
        id: participant._id.toString(),
        firstName: participant.firstName,
        lastName: participant.lastName,
        userName: participant.userName,
        email: participant.email,
      })),
      groupAdmin: conversation.groupAdmin
        ? {
            id: (conversation.groupAdmin as any)._id.toString(),
            firstName: (conversation.groupAdmin as any).firstName,
            lastName: (conversation.groupAdmin as any).lastName,
            userName: (conversation.groupAdmin as any).userName,
            email: (conversation.groupAdmin as any).email,
          }
        : null,
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
        hasPrev,
      },
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
      res
        .status(403)
        .json({ message: 'Only group admin can update group photo' });
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

    // Create group event for photo change
    const eventMessage = await GroupEventService.createPhotoChangeEvent(
      conversation._id,
      user._id,
    );

    // Get user info for notifications
    const adminUser = await User.findById(user._id).select(
      'firstName lastName userName',
    );

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

      // Send the group event message
      WebSocketManager.sendMessage(participantId.toString(), {
        type: 'new_message',
        message: eventMessage,
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

export const inviteUnregisteredUsers = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { emails } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      res
        .status(400)
        .json({ message: 'Please provide at least one email address' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      res.status(400).json({
        message: 'Invalid email addresses provided',
        invalidEmails,
      });
      return;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    if (!conversation.isGroup) {
      res.status(400).json({ message: 'Can only invite users to group chats' });
      return;
    }

    if (conversation.groupAdmin?.toString() !== user._id.toString()) {
      res.status(403).json({ message: 'Only group admin can invite users' });
      return;
    }

    // Check if any emails are already registered users
    const existingUsers = await User.find({
      email: { $in: emails.map((email) => email.toLowerCase()) },
    });

    if (existingUsers.length > 0) {
      const existingEmails = existingUsers.map((user) => user.email);
      res.status(400).json({
        message:
          'Some email addresses are already registered users. Please use the "Add people" feature instead.',
        existingEmails,
      });
      return;
    }

    // Check for existing unused invitations
    const existingInvitations = await InvitationToken.find({
      email: { $in: emails.map((email) => email.toLowerCase()) },
      conversationId: conversationId,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    const alreadyInvitedEmails = existingInvitations.map(
      (invitation) => invitation.email,
    );
    const newEmails = emails.filter(
      (email) => !alreadyInvitedEmails.includes(email.toLowerCase()),
    );

    if (newEmails.length === 0) {
      res.status(400).json({
        message:
          'All provided email addresses already have pending invitations',
        alreadyInvitedEmails,
      });
      return;
    }

    // Get user info for email
    const inviterUser = await User.findById(user._id).select(
      'firstName lastName userName',
    );
    const inviterName =
      inviterUser?.firstName && inviterUser?.lastName
        ? `${inviterUser.firstName} ${inviterUser.lastName}`
        : inviterUser?.userName || 'A ChatApp user';

    const groupName = conversation.groupName || 'Group Chat';
    const baseUrl = process.env.CLIENT_URL;

    // Create invitation tokens and send emails
    const createdInvitations = [];
    const failedEmails = [];

    for (const email of newEmails) {
      try {
        const token = crypto.randomBytes(32).toString('hex');

        const invitation = new InvitationToken({
          email: email.toLowerCase(),
          token,
          conversationId,
          invitedBy: user._id,
        });

        await invitation.save();

        const invitationLink = `${baseUrl}/register?invitation=${token}`;

        await sendInvitationEmail(
          email,
          inviterName,
          groupName,
          invitationLink,
        );

        createdInvitations.push({ email, token });
      } catch (error) {
        console.error(`Failed to create invitation for ${email}:`, error);
        failedEmails.push(email);
      }
    }

    const successCount = createdInvitations.length;
    const failedCount = failedEmails.length;

    let message = `Successfully sent ${successCount} invitation(s)`;
    if (failedCount > 0) {
      message += `, but ${failedCount} failed to send`;
    }
    if (alreadyInvitedEmails.length > 0) {
      message += `. ${alreadyInvitedEmails.length} email(s) already had pending invitations`;
    }

    res.json({
      message,
      successCount,
      failedCount,
      alreadyInvitedCount: alreadyInvitedEmails.length,
      failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
      alreadyInvitedEmails:
        alreadyInvitedEmails.length > 0 ? alreadyInvitedEmails : undefined,
    });
  } catch (error) {
    console.error('Error inviting unregistered users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// User conversation functions moved from messageController
export const getConversations = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user!._id;

    const conversations = await conversationService.getUserConversations(
      userId.toString()
    );

    const formattedConversations = conversations.map((conv) => {
      // Convert readAt Map to object for JSON serialization
      const readAtObject: Record<string, string> = {};

      try {
        if (conv.readAt && conv.readAt instanceof Map) {
          // Handle Map objects (when not using .lean())
          for (const [key, value] of conv.readAt) {
            readAtObject[key] = value.toISOString();
          }
        } else if (conv.readAt && typeof conv.readAt === 'object') {
          // Handle plain objects (when using .lean())
          for (const [key, value] of Object.entries(conv.readAt)) {
            if (value instanceof Date) {
              readAtObject[key] = value.toISOString();
            } else if (typeof value === 'string') {
              readAtObject[key] = value;
            }
          }
        }
        // If readAt doesn't exist or is invalid, readAtObject remains empty
      } catch (error) {
        console.error(
          'Error processing readAt for conversation:',
          conv._id,
          error,
        );
        // readAtObject remains empty object
      }

      if (conv.isGroup) {
        // For group conversations
        return {
          _id: conv._id,
          isGroup: true,
          groupName: conv.groupName,
          groupAdmin: conv.groupAdmin,
          groupPhoto: conv.groupPhoto || undefined,
          participants: conv.participants,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount?.[userId.toString()] || 0,
          readAt: readAtObject,
        };
      } else {
        // For direct conversations - maintain backward compatibility
        const otherParticipant = conv.participants.find(
          (p: any) => p._id.toString() !== userId.toString(),
        );

        return {
          _id: conv._id,
          isGroup: false,
          participant: otherParticipant,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount?.[userId.toString()] || 0,
          readAt: readAtObject,
        };
      }
    });

    res.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const conversation = req.conversation; // From middleware

    // Mark conversation as read using MessageService
    await messageService.markConversationAsRead(conversation, userId);

    // Notify other participants via WebSocket
    const otherParticipants = conversation.participants.filter(
      (p: any) => p.toString() !== userId.toString(),
    );

    // Get user info for notifications
    const user = await userService.getUserInfo(userId);

    if (user) {
      notificationService.notifyConversationRead(
        otherParticipants,
        conversation._id,
        user,
        conversation.readAt.get(userId.toString()),
        conversation.isGroup
      );
    }

    res.json({
      message: 'Conversation marked as read',
      readAt: conversation.readAt.get(userId.toString()),
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateGroupName = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { conversationId } = req.params;
    const { groupName } = req.body;
    const userId = req.user!._id;
    const conversation = req.conversation; // From middleware

    // Update the group name (allow empty string to remove name)
    const oldName = conversation.groupName || '';
    const trimmedGroupName = groupName?.trim() || null;
    conversation.groupName = trimmedGroupName;
    await conversation.save();

    // Create group event for name change
    const eventMessage = await GroupEventService.createNameChangeEvent(
      conversation._id,
      userId,
      oldName,
      trimmedGroupName || '',
    );

    // Get updated conversation with populated participants
    const updatedConversation = await conversationService.getPopulatedConversation(conversationId);

    // Notify all participants via WebSocket
    const user = await userService.getUserInfo(userId);

    if (user) {
      notificationService.notifyGroupNameUpdate(
        conversation.participants,
        conversation._id,
        trimmedGroupName,
        user,
        updatedConversation
      );
      
      notificationService.broadcastGroupEvent(conversation.participants, eventMessage);
    }

    res.json({
      message: 'Group name updated successfully',
      groupName: trimmedGroupName,
    });
  } catch (error) {
    console.error('Error updating group name:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const leaveGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const conversation = req.conversation; // From middleware

    // Create group event for user left before removing them
    const eventMessage = await GroupEventService.createUserLeftEvent(
      conversation._id,
      userId,
    );

    // Remove user from participants
    conversation.participants = conversation.participants.filter(
      (participant: any) => participant.toString() !== userId.toString(),
    );

    // Remove user from unread counts and readAt
    conversation.unreadCount.delete(userId.toString());
    conversation.readAt.delete(userId.toString());

    // If the user was the admin, assign a new admin randomly
    if (conversation.groupAdmin?.toString() === userId.toString()) {
      if (conversation.participants.length > 0) {
        const randomIndex = Math.floor(
          Math.random() * conversation.participants.length,
        );
        conversation.groupAdmin = conversation.participants[randomIndex];
      } else {
        // If no participants left, mark conversation as inactive
        conversation.isActive = false;
      }
    }

    await conversation.save();

    // Get user info for notifications
    const user = await userService.getUserInfo(userId);

    // Notify remaining participants via WebSocket
    if (user) {
      notificationService.notifyUserLeftGroup(
        conversation.participants,
        conversation._id,
        user,
        conversation.groupAdmin?.toString(),
        conversation.isActive
      );
      
      notificationService.broadcastGroupEvent(conversation.participants, eventMessage);
    }

    res.json({
      message: 'Left group successfully',
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const addMembersToGroup = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { conversationId } = req.params;
    const { userIds } = req.body;
    const userId = req.user!._id;
    const conversation = req.conversation; // From middleware

    // Filter out users who are already participants
    const existingParticipantIds = conversation.participants.map((p: any) =>
      p.toString(),
    );
    const newUserIds = userIds.filter(
      (id: string) => !existingParticipantIds.includes(id),
    );

    if (newUserIds.length === 0) {
      return res
        .status(400)
        .json({ message: 'All users are already members of this group' });
    }

    // Add new members to the conversation
    conversation.participants.push(...newUserIds);

    // Initialize unread counts and readAt for new members
    newUserIds.forEach((userId: string) => {
      conversation.unreadCount.set(userId, 0);
      conversation.readAt.set(userId, new Date(0));
    });

    await conversation.save();

    // Create group events for each added user
    for (const addedUserId of newUserIds) {
      const eventMessage = await GroupEventService.createUserAddedEvent(
        conversation._id,
        userId,
        addedUserId,
      );

      // Send the group event message to all participants
      notificationService.broadcastGroupEvent(conversation.participants, eventMessage);
    }

    // Get updated conversation with populated participants
    const updatedConversation = await conversationService.getPopulatedConversation(conversationId);

    // Get user info for notifications
    const addedBy = await userService.getUserInfo(userId);
    const newMembers = await userService.getMultipleUsersInfo(newUserIds);

    // Notify all participants via WebSocket
    if (addedBy) {
      notificationService.notifyMembersAdded(
        conversation.participants,
        conversation._id,
        newMembers,
        addedBy,
        updatedConversation
      );
    }

    res.json({
      message: 'Members added successfully',
      addedMembers: newMembers.map((member) => ({
        _id: member._id,
        userName: member.userName,
        firstName: member.firstName,
        lastName: member.lastName,
      })),
    });
  } catch (error) {
    console.error('Error adding members to group:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const changeGroupAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { conversationId } = req.params;
    const { newAdminId } = req.body;
    const userId = req.user!._id;
    const conversation = req.conversation; // From middleware
    
    // Get user info from middleware
    const newAdmin = req.body.newAdminIdInfo;

    const currentAdmin = await userService.getUserInfo(userId);

    // Change the group admin
    conversation.groupAdmin = newAdminId;
    await conversation.save();

    // Create group event for user promoted
    const eventMessage = await GroupEventService.createUserPromotedEvent(
      conversation._id,
      userId,
      newAdminId,
    );

    // Get updated conversation with populated participants
    const updatedConversation = await conversationService.getPopulatedConversation(conversationId);

    // Notify all participants via WebSocket
    if (currentAdmin) {
      notificationService.notifyGroupAdminChange(
        conversation.participants,
        conversation._id,
        newAdmin,
        currentAdmin,
        updatedConversation
      );
    }
    
    // Send the group event message
    notificationService.broadcastGroupEvent(conversation.participants, eventMessage);

    res.json({
      message: 'Group admin changed successfully',
      newAdmin: {
        _id: newAdmin._id,
        userName: newAdmin.userName,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
      },
    });
  } catch (error) {
    console.error('Error changing group admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeMemberFromGroup = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { conversationId } = req.params;
    const { userToRemoveId } = req.body;
    const userId = req.user!._id;
    const conversation = req.conversation; // From middleware
    
    // Get user info from middleware
    const removedUser = req.body.userToRemoveIdInfo;

    // Create group event for user removed before removing them
    const eventMessage = await GroupEventService.createUserRemovedEvent(
      conversation._id,
      userId,
      userToRemoveId,
    );

    // Remove user from participants
    conversation.participants = conversation.participants.filter(
      (participant: any) => participant.toString() !== userToRemoveId,
    );

    // Remove user from unread counts and readAt
    conversation.unreadCount.delete(userToRemoveId);
    conversation.readAt.delete(userToRemoveId);

    await conversation.save();

    // Get updated conversation with populated participants
    const updatedConversation = await conversationService.getPopulatedConversation(conversationId);

    // Get admin info for notifications
    const admin = await userService.getUserInfo(userId);
    
    if (admin) {
      // Notify the removed user
      notificationService.notifyUserRemovedFromGroup(
        userToRemoveId,
        conversation._id,
        admin
      );

      // Notify remaining participants via WebSocket
      notificationService.notifyMemberRemoved(
        conversation.participants,
        conversation._id,
        removedUser,
        admin,
        updatedConversation
      );

      // Send the group event message
      notificationService.broadcastGroupEvent(conversation.participants, eventMessage);
    }

    res.json({
      message: 'Member removed successfully',
      removedUser: {
        _id: removedUser._id,
        userName: removedUser.userName,
        firstName: removedUser.firstName,
        lastName: removedUser.lastName,
      },
    });
  } catch (error) {
    console.error('Error removing member from group:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
