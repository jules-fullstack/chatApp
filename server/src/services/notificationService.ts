import WebSocketManager from '../config/websocket.js';
import { Types } from 'mongoose';

export interface UserInfo {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  userName: string;
}

export interface NotificationData {
  type: string;
  [key: string]: any;
}

class NotificationService {
  /**
   * Send WebSocket notification to multiple participants
   */
  notifyParticipants(
    participantIds: (string | Types.ObjectId)[],
    notificationData: NotificationData
  ) {
    participantIds.forEach((participantId) => {
      WebSocketManager.sendMessage(participantId.toString(), notificationData);
    });
  }

  /**
   * Send WebSocket notification to a single user
   */
  notifyUser(
    userId: string | Types.ObjectId,
    notificationData: NotificationData
  ) {
    WebSocketManager.sendMessage(userId.toString(), notificationData);
  }

  /**
   * Send message notification to participants (filtered by blocking)
   */
  notifyMessageRecipients(
    recipientIds: (string | Types.ObjectId)[],
    message: any
  ) {
    recipientIds.forEach((recipientId) => {
      WebSocketManager.sendMessageNotification(recipientId.toString(), message);
    });
  }

  /**
   * Broadcast group event message to all participants
   */
  broadcastGroupEvent(
    participantIds: (string | Types.ObjectId)[],
    eventMessage: any
  ) {
    this.notifyParticipants(participantIds, {
      type: 'new_message',
      message: eventMessage,
    });
  }

  /**
   * Notify participants about conversation read status
   */
  notifyConversationRead(
    participantIds: (string | Types.ObjectId)[],
    conversationId: string | Types.ObjectId,
    readBy: UserInfo,
    readAt: Date,
    isGroup: boolean
  ) {
    const notificationData = {
      type: 'conversation_read',
      conversationId: conversationId.toString(),
      readBy: {
        userId: readBy._id.toString(),
        userName: readBy.userName,
        firstName: readBy.firstName,
        lastName: readBy.lastName,
      },
      readAt,
      isGroup,
    };

    this.notifyParticipants(participantIds, notificationData);
  }

  /**
   * Notify participants about group name update
   */
  notifyGroupNameUpdate(
    participantIds: (string | Types.ObjectId)[],
    conversationId: string | Types.ObjectId,
    groupName: string | null,
    updatedBy: UserInfo,
    updatedConversation: any
  ) {
    const notificationData = {
      type: 'group_name_updated',
      conversationId: conversationId.toString(),
      groupName,
      updatedBy: {
        userId: updatedBy._id.toString(),
        userName: updatedBy.userName,
        firstName: updatedBy.firstName,
        lastName: updatedBy.lastName,
      },
      conversation: updatedConversation,
    };

    this.notifyParticipants(participantIds, notificationData);
  }

  /**
   * Notify participants about user leaving group
   */
  notifyUserLeftGroup(
    participantIds: (string | Types.ObjectId)[],
    conversationId: string | Types.ObjectId,
    leftUser: UserInfo,
    newAdmin: string | undefined,
    isActive: boolean
  ) {
    const notificationData = {
      type: 'user_left_group',
      conversationId: conversationId.toString(),
      leftUser: {
        userId: leftUser._id.toString(),
        userName: leftUser.userName,
        firstName: leftUser.firstName,
        lastName: leftUser.lastName,
      },
      newAdmin,
      isActive,
    };

    this.notifyParticipants(participantIds, notificationData);
  }

  /**
   * Notify participants about members added to group
   */
  notifyMembersAdded(
    participantIds: (string | Types.ObjectId)[],
    conversationId: string | Types.ObjectId,
    addedMembers: UserInfo[],
    addedBy: UserInfo,
    updatedConversation: any
  ) {
    const notificationData = {
      type: 'members_added_to_group',
      conversationId: conversationId.toString(),
      addedMembers: addedMembers.map((member) => ({
        userId: member._id.toString(),
        userName: member.userName,
        firstName: member.firstName,
        lastName: member.lastName,
      })),
      addedBy: {
        userId: addedBy._id.toString(),
        userName: addedBy.userName,
        firstName: addedBy.firstName,
        lastName: addedBy.lastName,
      },
      conversation: updatedConversation,
    };

    this.notifyParticipants(participantIds, notificationData);
  }

  /**
   * Notify participants about group admin change
   */
  notifyGroupAdminChange(
    participantIds: (string | Types.ObjectId)[],
    conversationId: string | Types.ObjectId,
    newAdmin: UserInfo,
    previousAdmin: UserInfo,
    updatedConversation: any
  ) {
    const notificationData = {
      type: 'group_admin_changed',
      conversationId: conversationId.toString(),
      newAdmin: {
        userId: newAdmin._id.toString(),
        userName: newAdmin.userName,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
      },
      previousAdmin: {
        userId: previousAdmin._id.toString(),
        userName: previousAdmin.userName,
        firstName: previousAdmin.firstName,
        lastName: previousAdmin.lastName,
      },
      conversation: updatedConversation,
    };

    this.notifyParticipants(participantIds, notificationData);
  }

  /**
   * Notify user about being removed from group
   */
  notifyUserRemovedFromGroup(
    userId: string | Types.ObjectId,
    conversationId: string | Types.ObjectId,
    removedBy: UserInfo
  ) {
    const notificationData = {
      type: 'removed_from_group',
      conversationId: conversationId.toString(),
      removedBy: {
        userId: removedBy._id.toString(),
        userName: removedBy.userName,
        firstName: removedBy.firstName,
        lastName: removedBy.lastName,
      },
    };

    this.notifyUser(userId, notificationData);
  }

  /**
   * Notify participants about member removed from group
   */
  notifyMemberRemoved(
    participantIds: (string | Types.ObjectId)[],
    conversationId: string | Types.ObjectId,
    removedUser: UserInfo,
    removedBy: UserInfo,
    updatedConversation: any
  ) {
    const notificationData = {
      type: 'member_removed_from_group',
      conversationId: conversationId.toString(),
      removedUser: {
        userId: removedUser._id.toString(),
        userName: removedUser.userName,
        firstName: removedUser.firstName,
        lastName: removedUser.lastName,
      },
      removedBy: {
        userId: removedBy._id.toString(),
        userName: removedBy.userName,
        firstName: removedBy.firstName,
        lastName: removedBy.lastName,
      },
      conversation: updatedConversation,
    };

    this.notifyParticipants(participantIds, notificationData);
  }

  /**
   * Send direct message notifications (standardized)
   */
  async notifyDirectMessageRecipients(
    recipientIds: (string | Types.ObjectId)[],
    message: any,
    senderId: string | Types.ObjectId,
    offlineNotificationService: any
  ) {
    const userService = (await import('./userService.js')).default;
    const senderName = await userService.getUserFullName(senderId);

    recipientIds.forEach((recipientId) => {
      // Send WebSocket notification
      WebSocketManager.sendMessageNotification(
        recipientId.toString(),
        message,
      );

      // Handle offline notification for direct messages
      offlineNotificationService.handleNewMessage(
        recipientId.toString(),
        senderId.toString(),
        senderName,
        false, // isGroup = false for direct messages
      );
    });
  }
}

// Export singleton instance
export default new NotificationService();