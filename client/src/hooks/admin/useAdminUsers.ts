import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import adminService from "../../services/adminService";
import adminSearchService from "../../services/adminSearchService";
import type { AdminUser } from "../../types/admin";

const QUERY_KEYS = {
  allUsers: "adminUsers",
};

interface UseAdminUsersProps {
  currentPage: number;
  isSearchActive: boolean;
  searchResults: AdminUser[];
  setSearchResults: (results: AdminUser[]) => void;
}

export function useAdminUsers({
  currentPage,
  isSearchActive,
  searchResults,
  setSearchResults,
}: UseAdminUsersProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // TanStack Query for fetching users
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isError: isErrorUsers,
    error: usersError,
  } = useQuery({
    queryKey: [QUERY_KEYS.allUsers, currentPage],
    queryFn: () => adminService.getAllUsers({ page: currentPage, limit: 10 }),
    placeholderData: (previousData) => previousData,
  });

  // Computed values
  const displayUsers = isSearchActive ? searchResults : usersData?.users || [];

  const handleBlockUser = useMutation({
    mutationFn: adminService.blockUser,
    onMutate: async (userId) => {
      setActionLoading(userId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.allUsers] });

      // Snapshot the previous value
      const previousUsers = queryClient.getQueryData([
        QUERY_KEYS.allUsers,
        currentPage,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [QUERY_KEYS.allUsers, currentPage],
        (oldData: typeof usersData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            users: oldData.users.map((user) =>
              user.id === userId ? { ...user, isBlocked: true } : user
            ),
          };
        }
      );

      // Also update search results if search is active
      if (isSearchActive) {
        setSearchResults(
          adminSearchService.updateUserBlockedStatus(userId, true, searchResults)
        );
      }

      return { previousUsers };
    },
    onError: (err, userId, context) => {
      queryClient.setQueryData(
        [QUERY_KEYS.allUsers, currentPage],
        context?.previousUsers
      );

      // Also rollback search results if search is active
      if (isSearchActive) {
        setSearchResults(
          adminSearchService.updateUserBlockedStatus(userId, false, searchResults)
        );
      }

      console.error("Failed to block user:", err);
    },
    onSettled: () => {
      setActionLoading(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.allUsers] });
    },
  });

  const handleUnblockUser = useMutation({
    mutationFn: adminService.unblockUser,
    onMutate: async (userId) => {
      setActionLoading(userId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.allUsers] });

      const previousUsers = queryClient.getQueryData([
        QUERY_KEYS.allUsers,
        currentPage,
      ]);

      queryClient.setQueryData(
        [QUERY_KEYS.allUsers, currentPage],
        (oldData: typeof usersData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            users: oldData.users.map((user) =>
              user.id === userId ? { ...user, isBlocked: false } : user
            ),
          };
        }
      );

      // Also update search results if search is active
      if (isSearchActive) {
        setSearchResults(
          adminSearchService.updateUserBlockedStatus(userId, false, searchResults)
        );
      }

      return { previousUsers };
    },
    onError: (err, userId, context) => {
      queryClient.setQueryData(
        [QUERY_KEYS.allUsers, currentPage],
        context?.previousUsers
      );

      // Also rollback search results if search is active
      if (isSearchActive) {
        setSearchResults(
          adminSearchService.updateUserBlockedStatus(userId, true, searchResults)
        );
      }

      console.error("Failed to unblock user:", err);
    },
    onSettled: () => {
      setActionLoading(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.allUsers] });
    },
  });

  return {
    usersData,
    displayUsers,
    isLoadingUsers,
    isErrorUsers,
    usersError,
    actionLoading,
    handleBlockUser,
    handleUnblockUser,
  };
}