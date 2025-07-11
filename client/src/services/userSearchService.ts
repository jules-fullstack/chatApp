import { type SearchedUser, type SearchResponse } from "../types/index";

class UserSearchService {
  private baseUrl = import.meta.env.DEV
    ? "http://localhost:3000/api/users"
    : "/api/users";

  async searchUsers(query: string): Promise<SearchedUser[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/search?query=${encodeURIComponent(query)}`,
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
        let errorMessage = "Failed to search users";

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // do nothing — fallback to default message
        }

        throw new Error(errorMessage);
      }

      const data: SearchResponse = await response.json();
      return data.users || [];
    } catch (error) {
      console.error("User search error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred");
    }
  }
}

export default new UserSearchService();
