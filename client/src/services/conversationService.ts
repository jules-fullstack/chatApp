import { type SearchedUser } from "../types/index";
import { API_BASE_URL } from "../config";

class ConversationService {
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
