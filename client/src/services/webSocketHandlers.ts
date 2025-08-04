import { API_BASE_URL } from "../config";
import { userStore } from "../store/userStore";
import type { Message } from "../types";
import type { MessageHandlers } from "./webSocketTypes";

export const messageHandlers: MessageHandlers = {
  new_message: (data, actions) => {
    const messageData = data as { message: Message };
    actions.handleIncomingMessage(messageData.message);
  },

  user_typing: (data, actions) => {
    const typingData = data as {
      userId: string;
      isTyping: boolean;
      conversationId?: string;
    };

    // Only show typing indicator if it's for the active conversation
    const { activeConversation } = actions.getState();
    if (!activeConversation) return;

    // Determine if this typing event is for the current conversation
    let isForCurrentConversation = false;
    let eventConversationId: string;
    
    if (activeConversation.startsWith("user:")) {
      // Direct message with user: format
      const targetUserId = activeConversation.replace("user:", "");
      
      // For direct messages, typing is relevant if:
      // 1. The typing user is the target user, OR
      // 2. The conversationId matches the target user ID, OR  
      // 3. The conversationId matches the activeConversation
      if (typingData.userId === targetUserId || 
          typingData.conversationId === targetUserId ||
          typingData.conversationId === activeConversation) {
        isForCurrentConversation = true;
        eventConversationId = activeConversation;
      }
    } else {
      // Group chat or existing conversation - check conversation ID match
      if (typingData.conversationId === activeConversation) {
        isForCurrentConversation = true;
        eventConversationId = activeConversation;
      }
    }

    if (!isForCurrentConversation) return;

    // Try to get user info from conversations
    const userInfo = actions.getUserInfoFromConversations(typingData.userId);
    actions.setTypingUser(typingData.userId, typingData.isTyping, eventConversationId!, userInfo);
  },

  conversation_read: (data, actions) => {
    actions.handleConversationRead(data);
  },

  group_name_updated: (data, actions) => {
    actions.handleGroupNameUpdated(data);
  },

  group_photo_updated: (data, actions) => {
    actions.handleGroupPhotoUpdated(data);
  },

  user_left_group: (data, actions) => {
    actions.handleUserLeftGroup(data);
  },

  members_added_to_group: (data, actions) => {
    actions.handleMembersAddedToGroup(data);
  },

  group_admin_changed: (data, actions) => {
    actions.handleGroupAdminChanged(data);
  },

  blocking_update: (data, actions) => {
    actions.handleBlockingUpdate(data);
  },

  member_removed_from_group: (data, actions) => {
    actions.handleMemberRemovedFromGroup(data);
  },

  removed_from_group: (data, actions) => {
    actions.handleRemovedFromGroup(data);
  },

  user_status: (data, actions) => {
    const statusData = data as { userId: string; isOnline: boolean };
    actions.setUserOnline(statusData.userId, statusData.isOnline);
  },

  online_users_list: (data, actions) => {
    const usersData = data as { userIds: string[] };
    // Set initial online users when first connecting
    usersData.userIds.forEach((userId: string) => {
      actions.setUserOnline(userId, true);
    });
  },

  account_blocked: async (data, actions) => {
    const blockData = data as { message?: string };

    // Handle account blocking - perform logout sequence
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error during logout:", error);
    }

    // Clear user and reset stores
    userStore.getState().clearUser();
    actions.resetStore();

    // Show blocking message
    alert(
      blockData.message || "Your account has been blocked from the platform."
    );

    // Redirect to login page
    window.location.href = "/login";
  },

  blocked_by_user: (_, actions) => {
    actions.triggerBlockingUpdate();
  },

  unblocked_by_user: (_, actions) => {
    actions.triggerBlockingUpdate();
  },
};
