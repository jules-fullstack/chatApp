import userSearchService from "./userSearchService";
import type { SearchedUser } from "../types/index";
import type { AdminUser } from "../types/admin";

/**
 * Admin-specific search service that transforms user search results
 * to be compatible with AdminWindow component expectations
 */
class AdminSearchService {
  /**
   * Search for users and transform results to AdminUser format
   * @param query - Search query string
   * @returns Promise<AdminUser[]> - Array of users in AdminUser format
   */
  async searchUsers(query: string): Promise<AdminUser[]> {
    try {
      // Use existing userSearchService to get search results
      const searchResults: SearchedUser[] =
        await userSearchService.searchUsers(query);

      // Transform SearchedUser[] to AdminUser[] format
      const adminUsers: AdminUser[] = searchResults.map(
        this.transformToAdminUser
      );

      return adminUsers;
    } catch (error) {
      console.error("Admin search error:", error);
      throw error instanceof Error
        ? error
        : new Error("An unexpected error occurred during admin search");
    }
  }

  /**
   * Transform a SearchedUser to AdminUser format
   * @param searchedUser - User from search results
   * @returns AdminUser - Transformed user with admin-compatible fields
   */
  private transformToAdminUser(searchedUser: SearchedUser): AdminUser {
    return {
      // Map _id to id for AdminWindow compatibility
      id: searchedUser._id,

      // Preserve existing fields
      userName: searchedUser.userName,
      firstName: searchedUser.firstName,
      lastName: searchedUser.lastName,

      // Add placeholder/default values for missing fields
      email: searchedUser.email, // Email not available in search results
      role: searchedUser.role, // Default role assumption
      isEmailVerified: searchedUser.isEmailVerified, // Default assumption
      isBlocked: searchedUser.isBlocked, // Default assumption - will be updated if needed

      // Preserve avatar if present
      avatar: searchedUser.avatar,

      // Add placeholder timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update the blocked status of a user in search results
   * This can be used to sync with actual user status if needed
   * @param userId - User ID to update
   * @param isBlocked - New blocked status
   * @param searchResults - Current search results array
   * @returns Updated search results array
   */
  updateUserBlockedStatus(
    userId: string,
    isBlocked: boolean,
    searchResults: AdminUser[]
  ): AdminUser[] {
    return searchResults.map((user) =>
      user.id === userId
        ? { ...user, isBlocked, updatedAt: new Date().toISOString() }
        : user
    );
  }
}

export default new AdminSearchService();
