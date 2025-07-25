import { Request, Response } from 'express';
import Conversation from '../models/Conversation.js';
import mediaService from '../services/mediaService.js';
import invitationService from '../services/invitationService.js';
import { IUser } from '../types/index.js';
import { GroupEventService } from '../services/groupEventService.js';
import conversationService from '../services/conversationService.js';
import userService from '../services/userService.js';
import notificationService from '../services/notificationService.js';
import messageService from '../services/messageService.js';

interface AuthenticatedRequest extends Request {
  user?: IUser;
  conversation?: any;
  validatedEmails?: string[];
  newEmails?: string[];
  alreadyInvitedEmails?: string[];
}

export const getAllGroupConversations = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get conversations using service
    const result = await conversationService.getAdminGroupConversations(page, limit);

    // Format conversations for response
    const conversationData = result.conversations.map((conversation: any) => ({
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
            id: conversation.groupAdmin._id.toString(),
            firstName: conversation.groupAdmin.firstName,
            lastName: conversation.groupAdmin.lastName,
            userName: conversation.groupAdmin.userName,
            email: conversation.groupAdmin.email,
          }
        : null,
      participantCount: conversation.participants.length,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
    }));

    res.json({
      conversations: conversationData,
      pagination: result.pagination,
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
    const user = req.user!;

    const conversation = req.conversation;

    const file = req.file!;

    // Delete old group photo if exists
    if (conversation.groupPhoto) {
      try {
        await mediaService.deleteMedia(conversation.groupPhoto);
      } catch (error) {
        console.error('Error deleting old group photo:', error);
        // Continue with upload even if deletion fails
      }
    }

    // Create group photo using media service
    const media = await mediaService.createGroupPhoto(
      file,
      conversation._id,
      conversation.groupName
    );

    // Update conversation with new group photo
    conversation.groupPhoto = media._id;
    await conversation.save();

    // Create group event for photo change
    const eventMessage = await GroupEventService.createPhotoChangeEvent(
      conversation._id,
      user._id,
    );

    // Get user info for notifications
    const adminUser = await userService.getUserInfo(user._id);

    // Notify all participants via WebSocket
    if (adminUser) {
      notificationService.notifyGroupPhotoUpdate(
        conversation.participants,
        conversation._id,
        media,
        adminUser,
      );

      // Send the group event message
      notificationService.broadcastGroupEvent(
        conversation.participants,
        eventMessage,
      );
    }

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
    const user = req.user!;
    const conversation = req.conversation!;
    const newEmails = req.newEmails!;
    const alreadyInvitedEmails = req.alreadyInvitedEmails || [];

    // Get user info for email
    const inviterUser = await userService.getUserInfo(user._id);
    const inviterName =
      inviterUser?.firstName && inviterUser?.lastName
        ? `${inviterUser.firstName} ${inviterUser.lastName}`
        : inviterUser?.userName || 'A ChatApp user';

    const groupName = conversation.groupName || 'Group Chat';

    // Create invitation tokens and send emails using service
    const results = await Promise.all(
      newEmails.map((email) =>
        invitationService.createInvitation(
          email,
          conversationId,
          user._id,
          inviterName,
          groupName
        )
      )
    );

    const createdInvitations = results
      .filter((result) => result.success)
      .map((result) => ({ email: result.email, token: result.token }));
    
    const failedEmails = results
      .filter((result) => !result.success)
      .map((result) => result.email);

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
      userId.toString(),
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
        conversation.isGroup,
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
    const updatedConversation =
      await conversationService.getPopulatedConversation(conversationId);

    // Notify all participants via WebSocket
    const user = await userService.getUserInfo(userId);

    if (user) {
      notificationService.notifyGroupNameUpdate(
        conversation.participants,
        conversation._id,
        trimmedGroupName,
        user,
        updatedConversation,
      );

      notificationService.broadcastGroupEvent(
        conversation.participants,
        eventMessage,
      );
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
        conversation.isActive,
      );

      notificationService.broadcastGroupEvent(
        conversation.participants,
        eventMessage,
      );
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
      notificationService.broadcastGroupEvent(
        conversation.participants,
        eventMessage,
      );
    }

    // Get updated conversation with populated participants
    const updatedConversation =
      await conversationService.getPopulatedConversation(conversationId);

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
        updatedConversation,
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
    const updatedConversation =
      await conversationService.getPopulatedConversation(conversationId);

    // Notify all participants via WebSocket
    if (currentAdmin) {
      notificationService.notifyGroupAdminChange(
        conversation.participants,
        conversation._id,
        newAdmin,
        currentAdmin,
        updatedConversation,
      );
    }

    // Send the group event message
    notificationService.broadcastGroupEvent(
      conversation.participants,
      eventMessage,
    );

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
    const updatedConversation =
      await conversationService.getPopulatedConversation(conversationId);

    // Get admin info for notifications
    const admin = await userService.getUserInfo(userId);

    if (admin) {
      // Notify the removed user
      notificationService.notifyUserRemovedFromGroup(
        userToRemoveId,
        conversation._id,
        admin,
      );

      // Notify remaining participants via WebSocket
      notificationService.notifyMemberRemoved(
        conversation.participants,
        conversation._id,
        removedUser,
        admin,
        updatedConversation,
      );

      // Send the group event message
      notificationService.broadcastGroupEvent(
        conversation.participants,
        eventMessage,
      );
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
