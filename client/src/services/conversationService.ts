import { type SearchedUser, type Message, type Conversation } from "../types/index";
import { API_BASE_URL } from "../config";

/**
 * Service class for handling all conversation-related API calls.
 * This centralizes all network requests and separates them from state management.
 */
class ConversationService {
  /**
   * Sends a message to recipients or a conversation
   * @param targets - Array of recipient IDs or conversation ID
   * @param content - Message content
   * @param groupName - Optional group name for new group messages
   * @param messageType - Type of message (default: "text")
   * @param images - Optional array of image URLs
   * @param isNewMessage - Whether this is a new message to multiple recipients
   * @param activeConversation - Current active conversation ID
   */
  async sendMessage(
    targets: string[],
    content: string,
    groupName?: string,
    messageType?: string,
    images?: string[],
    isNewMessage?: boolean,
    activeConversation?: string | null
  ): Promise<{ data: Message }> {
    let requestBody;
    if (isNewMessage) {
      // New message - send to multiple recipients
      requestBody = {
        recipientIds: targets,
        content,
        messageType: messageType || "text",
        ...(groupName !== undefined && { groupName }),
        ...(images && images.length > 0 && { images }),
      };
    } else if (activeConversation?.startsWith("user:")) {
      // Direct message to a user (new conversation)
      const userId = activeConversation.replace("user:", "");
      requestBody = {
        recipientIds: [userId],
        content,
        messageType: messageType || "text",
        ...(images && images.length > 0 && { images }),
      };
    } else {
      // Existing conversation - send to conversation
      requestBody = {
        conversationId: activeConversation,
        content,
        messageType: messageType || "text",
        ...(images && images.length > 0 && { images }),
      };
    }

    const response = await fetch(`${API_BASE_URL}/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    return await response.json();
  }

  /**
   * Loads messages for a conversation or user
   * @param conversationId - Conversation ID or "user:userId" for direct messages
   */
  async loadMessages(conversationId: string): Promise<{
    messages: Message[];
    pagination?: { hasMore: boolean; nextCursor: string | null };
  }> {
    let url;
    if (conversationId.startsWith("user:")) {
      // Direct message to a user - use legacy endpoint
      const userId = conversationId.replace("user:", "");
      url = `${API_BASE_URL}/messages/conversation/user/${userId}?limit=50`;
    } else {
      // Existing conversation - load most recent 50 messages
      url = `${API_BASE_URL}/messages/conversation/${conversationId}?limit=50`;
    }

    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      // If conversation doesn't exist yet, return empty result
      if (response.status === 403 || response.status === 404) {
        return {
          messages: [],
          pagination: { hasMore: false, nextCursor: null },
        };
      }
      throw new Error("Failed to load messages");
    }

    return await response.json();
  }

  /**
   * Loads older messages for pagination
   * @param conversationId - Conversation ID or "user:userId" for direct messages
   * @param cursor - Pagination cursor
   */
  async loadOlderMessages(
    conversationId: string,
    cursor: string
  ): Promise<{
    messages: Message[];
    pagination?: { hasMore: boolean; nextCursor: string | null };
  }> {
    let url;
    if (conversationId.startsWith("user:")) {
      // Direct message to a user - use legacy endpoint
      const userId = conversationId.replace("user:", "");
      url = `${API_BASE_URL}/messages/conversation/user/${userId}?limit=50&before=${cursor}`;
    } else {
      // Existing conversation
      url = `${API_BASE_URL}/messages/conversation/${conversationId}?limit=50&before=${cursor}`;
    }

    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to load older messages");
    }

    return await response.json();
  }

  /**
   * Loads all conversations for the current user
   */
  async loadConversations(): Promise<Conversation[]> {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to load conversations");
    }

    return await response.json();
  }

  /**
   * Marks a conversation as read
   * @param conversationId - The conversation ID to mark as read
   */
  async markConversationAsRead(conversationId: string): Promise<{ readAt: string }> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/read`,
      {
        method: "PATCH",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to mark conversation as read");
    }

    return await response.json();
  }

  /**
   * Updates a group's name
   * @param conversationId - The group conversation ID
   * @param groupName - New group name
   */
  async updateGroupName(
    conversationId: string,
    groupName: string
  ): Promise<{ groupName: string }> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/name`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ groupName }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to update group name");
    }

    return await response.json();
  }

  /**
   * Leaves a group conversation
   * @param conversationId - The group conversation ID to leave
   */
  async leaveGroup(conversationId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/leave`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to leave group");
    }
  }

  /**
   * Changes the admin of a group conversation
   * @param conversationId - The group conversation ID
   * @param newAdminId - ID of the new admin user
   */
  async changeGroupAdmin(
    conversationId: string,
    newAdminId: string
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/admin`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ newAdminId }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to change group admin");
    }

    return await response.json();
  }

  /**
   * Removes a member from a group conversation
   * @param conversationId - The group conversation ID
   * @param userToRemoveId - ID of the user to remove
   */
  async removeMemberFromGroup(
    conversationId: string,
    userToRemoveId: string
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/members/${userToRemoveId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to remove member from group");
    }

    return await response.json();
  }

  /**
   * Adds members to a group conversation
   * @param conversationId - The group conversation ID
   * @param userIds - Array of user IDs to add
   */
  async addMembersToGroup(
    conversationId: string,
    userIds: string[]
  ): Promise<{
    message: string;
    addedMembers: SearchedUser[];
  }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/conversations/${conversationId}/members`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userIds }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to add members to group";

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // do nothing — fallback to default message
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Add members error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred");
    }
  }
}

export default new ConversationService();
