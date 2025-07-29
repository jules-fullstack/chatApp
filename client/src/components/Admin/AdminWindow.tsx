import { useEffect, useState } from "react";
import {
  Table,
  Loader,
  Alert,
  Title,
  Box,
  Pagination,
  Group,
  Text,
  Button,
  Menu,
} from "@mantine/core";
import { Container } from "../ui";
import type { AdminTab } from "./AdminSidebar";
import type { AdminGroupConversation, AdminUser } from "../../types/admin";
import {
  NoSymbolIcon,
  LockOpenIcon,
  UserPlusIcon,
  UserMinusIcon,
  UserIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import { AddPeopleModal } from "../modals";
import AdminRemoveMembersModal from "./AdminRemoveMembersModal";
import AdminPromoteMemberModal from "./AdminPromoteMemberModal";
import AdminActionConfirmModal from "./AdminActionConfirmModal";
import AdminSearchInput from "../admin/AdminSearchInput";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"; // Import TanStack Query hooks
import adminService from "../../services/adminService"; // Keep this import
import adminSearchService from "../../services/adminSearchService";
import useDebounce from "../../hooks/useDebounce";

interface AdminWindowProps {
  activeTab: AdminTab;
}

// Define query keys as constants for better maintainability
const QUERY_KEYS = {
  allUsers: "adminUsers",
  allGroupChats: "adminGroupChats",
};

export default function AdminWindow({ activeTab }: AdminWindowProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Group chat action states
  const [selectedGroupChat, setSelectedGroupChat] =
    useState<AdminGroupConversation | null>(null);
  const [isAddPeopleModalOpen, setIsAddPeopleModalOpen] = useState(false);
  const [isRemoveMembersModalOpen, setIsRemoveMembersModalOpen] =
    useState(false);
  const [isPromoteMemberModalOpen, setIsPromoteMemberModalOpen] =
    useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "remove" | "promote";
    data: string | string[];
  } | null>(null);

  const queryClient = useQueryClient(); // Initialize QueryClient

  // TanStack Query for fetching users
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isError: isErrorUsers,
    error: usersError,
  } = useQuery({
    queryKey: [QUERY_KEYS.allUsers, currentPage], // Query key depends on currentPage
    queryFn: () => adminService.getAllUsers({ page: currentPage, limit: 10 }),
    enabled: activeTab === "users", // Only fetch if 'users' tab is active
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new
  });

  // TanStack Query for fetching group conversations
  const {
    data: groupChatsData,
    isLoading: isLoadingGroupChats,
    isError: isErrorGroupChats,
    error: groupChatsError,
  } = useQuery({
    queryKey: [QUERY_KEYS.allGroupChats, currentPage], // Query key depends on currentPage
    queryFn: () =>
      adminService.getAllGroupConversations({ page: currentPage, limit: 10 }),
    enabled: activeTab === "group-chats", // Only fetch if 'group-chats' tab is active
    placeholderData: (previousData) => previousData,
  });

  // Effect to reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Effect to reset search when tab changes
  useEffect(() => {
    setSearchQuery("");
    setSearchResults([]);
  }, [activeTab]);

  // Effect for debounced search
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchQuery.trim() || activeTab !== "users") {
        setSearchResults([]);
        setIsLoadingSearch(false);
        return;
      }

      setIsLoadingSearch(true);
      try {
        const results = await adminSearchService.searchUsers(debouncedSearchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsLoadingSearch(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, activeTab]);

  // Computed values
  const isSearchActive = searchQuery.trim().length > 0;
  const displayUsers = isSearchActive ? searchResults : usersData?.users || [];

  const handleBlockUser = useMutation({
    mutationFn: adminService.blockUser,
    onMutate: async (userId) => {
      setActionLoading(userId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.allUsers] }); // Cancel outgoing queries

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
        setSearchResults(prev => 
          adminSearchService.updateUserBlockedStatus(userId, true, prev)
        );
      }

      return { previousUsers };
    },
    onError: (err, userId, context) => {
      queryClient.setQueryData(
        [QUERY_KEYS.allUsers, currentPage],
        context?.previousUsers
      ); // Rollback on error
      
      // Also rollback search results if search is active
      if (isSearchActive) {
        setSearchResults(prev => 
          adminSearchService.updateUserBlockedStatus(userId, false, prev)
        );
      }
      
      console.error("Failed to block user:", err);
    },
    onSettled: () => {
      setActionLoading(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.allUsers] }); // Invalidate to refetch fresh data
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
        setSearchResults(prev => 
          adminSearchService.updateUserBlockedStatus(userId, false, prev)
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
        setSearchResults(prev => 
          adminSearchService.updateUserBlockedStatus(userId, true, prev)
        );
      }
      
      console.error("Failed to unblock user:", err);
    },
    onSettled: () => {
      setActionLoading(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.allUsers] });
    },
  });

  // Group chat action handlers
  const handleAddPeople = (conversation: AdminGroupConversation) => {
    setSelectedGroupChat(conversation);
    setIsAddPeopleModalOpen(true);
  };

  const handleRemoveMembers = (conversation: AdminGroupConversation) => {
    setSelectedGroupChat(conversation);
    setIsRemoveMembersModalOpen(true);
  };

  const handlePromoteMember = (conversation: AdminGroupConversation) => {
    setSelectedGroupChat(conversation);
    setIsPromoteMemberModalOpen(true);
  };

  const handleMembersAdded = () => {
    // Invalidate group chats query to refetch data after members are added
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.allGroupChats] });
  };

  const handleConfirmRemoveMembers = (userIds: string[]) => {
    setConfirmAction({
      type: "remove",
      data: userIds,
    });
    setIsRemoveMembersModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmPromoteMember = (userId: string) => {
    setConfirmAction({
      type: "promote",
      data: userId,
    });
    setIsPromoteMemberModalOpen(false);
    setIsConfirmModalOpen(true);
  };

  const executeConfirmActionMutation = useMutation({
    mutationFn: async ({
      conversationId,
      actionType,
      data,
    }: {
      conversationId: string;
      actionType: "remove" | "promote";
      data: string | string[];
    }) => {
      if (actionType === "remove") {
        await adminService.removeMembersFromGroup(
          conversationId,
          data as string[]
        );
      } else if (actionType === "promote") {
        await adminService.promoteGroupMember(conversationId, data as string);
      }
    },
    onMutate: async (variables) => {
      setActionLoading(variables.conversationId);
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.allGroupChats] });

      const previousGroupChats = queryClient.getQueryData([
        QUERY_KEYS.allGroupChats,
        currentPage,
      ]);

      // Optimistic update for group chats (more complex, consider if truly necessary for this UI)
      // For simplicity, we'll just invalidate on success/error here.
      return { previousGroupChats };
    },
    onError: (err, _variables, context) => {
      queryClient.setQueryData(
        [QUERY_KEYS.allGroupChats, currentPage],
        context?.previousGroupChats
      );
      console.error("Action failed:", err);
    },
    onSettled: () => {
      setActionLoading(null);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.allGroupChats] }); // Invalidate to refetch fresh data
      closeAllModals(); // Close modals after action
    },
  });

  const executeConfirmAction = () => {
    if (!confirmAction || !selectedGroupChat) return;

    executeConfirmActionMutation.mutate({
      conversationId: selectedGroupChat.id,
      actionType: confirmAction.type,
      data: confirmAction.data,
    });
  };

  const closeAllModals = () => {
    setIsAddPeopleModalOpen(false);
    setIsRemoveMembersModalOpen(false);
    setIsPromoteMemberModalOpen(false);
    setIsConfirmModalOpen(false);
    setConfirmAction(null);
    setSelectedGroupChat(null);
  };

  // Convert AdminParticipant to Participant for modal compatibility
  const convertAdminParticipantsToParticipants = (
    adminParticipants: AdminGroupConversation["participants"]
  ) => {
    return adminParticipants.map((p) => ({
      _id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      userName: p.userName,
      email: p.email,
    }));
  };

  const renderUsersTable = () => {
    // Show loading for regular data or search
    if ((isLoadingUsers && !isSearchActive) || (isLoadingSearch && isSearchActive)) {
      return <Loader size="lg" className="mx-auto" />;
    }
    
    // Show error for regular data fetch
    if (isErrorUsers && !isSearchActive) {
      return (
        <Alert color="red">{usersError?.message || "An error occurred"}</Alert>
      );
    }
    
    // Show no results message
    if (displayUsers.length === 0) {
      if (isSearchActive) {
        return <Text ta="center" c="dimmed">No users found matching your search.</Text>;
      }
      return <Text ta="center" c="dimmed">No users found.</Text>;
    }

    const rows = displayUsers.map((user) => (
      <Table.Tr key={user.id}>
        <Table.Td>{user.userName}</Table.Td>
        <Table.Td>{user.firstName}</Table.Td>
        <Table.Td>{user.lastName}</Table.Td>
        <Table.Td>{user.email}</Table.Td>
        <Table.Td>
          {user.isBlocked ? (
            <LockOpenIcon
              className={`size-6 text-green-500 cursor-pointer ${
                handleUnblockUser.isPending && actionLoading === user.id
                  ? "opacity-50"
                  : ""
              }`}
              onClick={() => handleUnblockUser.mutate(user.id)}
              title="Unblock user"
            />
          ) : (
            <NoSymbolIcon
              className={`size-6 text-red-500 cursor-pointer ${
                handleBlockUser.isPending && actionLoading === user.id
                  ? "opacity-50"
                  : ""
              }`}
              onClick={() => handleBlockUser.mutate(user.id)}
              title="Block user"
            />
          )}
        </Table.Td>
      </Table.Tr>
    ));

    return (
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Username</Table.Th>
            <Table.Th>First Name</Table.Th>
            <Table.Th>Last Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    );
  };

  const renderGroupChatsTable = () => {
    if (isLoadingGroupChats) return <Loader size="lg" className="mx-auto" />;
    if (isErrorGroupChats)
      return (
        <Alert color="red">
          {groupChatsError?.message || "An error occurred"}
        </Alert>
      );
    if (!groupChatsData || groupChatsData.conversations.length === 0)
      return <p>No group chats found.</p>;

    const rows = groupChatsData.conversations.map((conversation) => (
      <Table.Tr key={conversation.id}>
        <Table.Td>{conversation.groupName || "Unnamed Group"}</Table.Td>
        <Table.Td>
          {conversation.participants.map((p) => p.userName).join(", ")}
        </Table.Td>
        <Table.Td>
          <Menu position="bottom-end" width={200}>
            <Menu.Target>
              <Button
                variant="subtle"
                size="sm"
                disabled={
                  executeConfirmActionMutation.isPending &&
                  actionLoading === conversation.id
                }
                loading={
                  executeConfirmActionMutation.isPending &&
                  actionLoading === conversation.id
                }
              >
                <EllipsisVerticalIcon className="size-4" />
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<UserPlusIcon className="size-4" />}
                onClick={() => handleAddPeople(conversation)}
              >
                Add people to group
              </Menu.Item>
              <Menu.Item
                leftSection={<UserMinusIcon className="size-4" />}
                onClick={() => handleRemoveMembers(conversation)}
                disabled={conversation.participants.length === 0}
              >
                Remove members
              </Menu.Item>
              <Menu.Item
                leftSection={<UserIcon className="size-4" />}
                onClick={() => handlePromoteMember(conversation)}
                disabled={conversation.participants.length === 0}
              >
                Promote member to admin
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Table.Td>
      </Table.Tr>
    ));

    return (
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Group Name</Table.Th>
            <Table.Th>Participants</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    );
  };

  const getTitle = () => {
    switch (activeTab) {
      case "users":
        return "Users";
      case "group-chats":
        return "Group Chats";
      default:
        return "Users";
    }
  };

  const renderPagination = () => {
    // Don't show pagination during search
    if (isSearchActive) return null;
    
    const pagination =
      activeTab === "users"
        ? usersData?.pagination
        : groupChatsData?.pagination;

    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <Group justify="space-between" mt="md">
        <Text size="sm" c="dimmed">
          Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}{" "}
          to{" "}
          {Math.min(
            pagination.currentPage * pagination.itemsPerPage,
            pagination.totalItems
          )}{" "}
          of {pagination.totalItems} items
        </Text>
        <Pagination
          value={currentPage}
          onChange={setCurrentPage}
          total={pagination.totalPages}
          size="sm"
        />
      </Group>
    );
  };

  const getConfirmMessage = () => {
    if (!confirmAction || !selectedGroupChat)
      return { title: "", message: "", confirmText: "", color: "blue" };

    if (confirmAction.type === "remove") {
      const userCount = (confirmAction.data as string[]).length;
      return {
        title: "Confirm Remove Members",
        message: `Are you sure you want to remove ${userCount} member(s) from "${selectedGroupChat.groupName || "this group"}"`,
        confirmText: `Remove ${userCount} Member(s)`,
        color: "red",
      };
    } else if (confirmAction.type === "promote") {
      const selectedUser = selectedGroupChat.participants.find(
        (p) => p.id === (confirmAction.data as string)
      );
      return {
        title: "Confirm Promote Member",
        message: `Are you sure you want to promote ${selectedUser?.userName || "this user"} to admin in "${selectedGroupChat.groupName || "this group"}"?`,
        confirmText: "Promote to Admin",
        color: "orange",
      };
    }

    return { title: "", message: "", confirmText: "", color: "blue" };
  };

  return (
    <main className="flex items-center mx-auto">
      <Container size="lg">
        <div className="p-8">
          <Box mb="lg">
            <Title order={2}>{getTitle()}</Title>
          </Box>
          
          {/* Search input - only show for users tab */}
          {activeTab === "users" && (
            <AdminSearchInput
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isSearchActive={isSearchActive}
              isLoadingSearch={isLoadingSearch}
              searchResults={searchResults}
              placeholder="Search users by name or username..."
            />
          )}
          
          {activeTab === "users" ? renderUsersTable() : renderGroupChatsTable()}
          {renderPagination()}
        </div>
      </Container>

      {/* Group Chat Action Modals */}
      {selectedGroupChat && (
        <>
          <AddPeopleModal
            opened={isAddPeopleModalOpen}
            onClose={closeAllModals}
            conversationId={selectedGroupChat.id}
            existingParticipants={convertAdminParticipantsToParticipants(
              selectedGroupChat.participants
            )}
            onMembersAdded={handleMembersAdded}
          />

          <AdminRemoveMembersModal
            opened={isRemoveMembersModalOpen}
            onClose={closeAllModals}
            onConfirm={handleConfirmRemoveMembers}
            participants={convertAdminParticipantsToParticipants(
              selectedGroupChat.participants
            )}
            groupName={selectedGroupChat.groupName || "Unnamed Group"}
          />

          <AdminPromoteMemberModal
            opened={isPromoteMemberModalOpen}
            onClose={closeAllModals}
            onConfirm={handleConfirmPromoteMember}
            participants={convertAdminParticipantsToParticipants(
              selectedGroupChat.participants
            )}
            groupName={selectedGroupChat.groupName || "Unnamed Group"}
            currentAdminId={selectedGroupChat.groupAdmin?.id}
          />
        </>
      )}

      <AdminActionConfirmModal
        opened={isConfirmModalOpen}
        onClose={closeAllModals}
        onConfirm={executeConfirmAction}
        isLoading={executeConfirmActionMutation.isPending}
        {...getConfirmMessage()}
      />
    </main>
  );
}
