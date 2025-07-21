import { type PaginatedUsersResponse, type PaginatedGroupConversationsResponse } from "../types/admin";

interface PaginationParams {
  page?: number;
  limit?: number;
}

class AdminService {
  private baseUrl = import.meta.env.DEV
    ? "http://localhost:3000/api"
    : "/api";

  async getAllUsers(params: PaginationParams = {}): Promise<PaginatedUsersResponse> {
    try {
      const { page = 1, limit = 10 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`${this.baseUrl}/users/admin/all?${queryParams}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

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

  async getAllGroupConversations(params: PaginationParams = {}): Promise<PaginatedGroupConversationsResponse> {
    try {
      const { page = 1, limit = 10 } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`${this.baseUrl}/conversations/admin/groups?${queryParams}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

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
      const response = await fetch(`${this.baseUrl}/users/admin/block/${userId}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

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
      const response = await fetch(`${this.baseUrl}/users/admin/unblock/${userId}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

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
}

export default new AdminService();