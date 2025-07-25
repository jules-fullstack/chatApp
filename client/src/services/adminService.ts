import {
  type PaginatedUsersResponse,
  type PaginatedGroupConversationsResponse,
} from "../types/admin";
import { API_BASE_URL } from "../config";

interface PaginationParams {
  page?: number;
  limit?: number;
}

class AdminService {
  async getAllUsers(
    params: PaginationParams = {}
  ): Promise<PaginatedUsersResponse> {
    try {
      const { page = 1, limit = 10 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(
        `${API_BASE_URL}/users/admin/all?${queryParams}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to fetch users";

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // fallback to default message
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        users: data.users || [],
        pagination: data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: limit,
          hasNext: false,
          hasPrev: false,
        },
      };
    } catch (error) {
      console.error("Admin users fetch error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred");
    }
  }

  async getAllGroupConversations(
    params: PaginationParams = {}
  ): Promise<PaginatedGroupConversationsResponse> {
    try {
      const { page = 1, limit = 10 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(
        `${API_BASE_URL}/conversations/admin/groups?${queryParams}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to fetch group conversations";

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // fallback to default message
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        conversations: data.conversations || [],
        pagination: data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: limit,
          hasNext: false,
          hasPrev: false,
        },
      };
    } catch (error) {
      console.error("Admin group conversations fetch error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred");
    }
  }

  async blockUser(userId: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/admin/block/${userId}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to block user";

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // fallback to default message
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Block user error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred");
    }
  }

  async unblockUser(userId: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/admin/unblock/${userId}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to unblock user";

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // fallback to default message
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Unblock user error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred");
    }
  }

  async addMembersToGroup(
    conversationId: string,
    userIds: string[]
  ): Promise<{ addedMembers: unknown[] }> {
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
          // fallback to default message
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error("Add members to group error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred");
    }
  }

  async removeMembersFromGroup(
    conversationId: string,
    userIds: string[]
  ): Promise<void> {
    try {
      // Since the backend endpoint only supports removing one member at a time,
      // we need to make multiple requests
      const removePromises = userIds.map(async (userId) => {
        const response = await fetch(
          `${API_BASE_URL}/conversations/${conversationId}/members/${userId}`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = "Failed to remove member from group";

          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch {
            // fallback to default message
          }

          throw new Error(errorMessage);
        }
      });

      // Wait for all removals to complete
      await Promise.all(removePromises);
    } catch (error) {
      console.error("Remove members from group error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred");
    }
  }

  async promoteGroupMember(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/conversations/${conversationId}/admin`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newAdminId: userId }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to promote member to admin";

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // fallback to default message
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Promote group member error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred");
    }
  }
}

export default new AdminService();
