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
import Container from "../ui/Container";
import type { AdminTab } from "./AdminSidebar";
import adminService from "../../services/adminService";
import type {
  AdminUser,
  AdminGroupConversation,
  PaginationInfo,
} from "../../types/admin";
import { 
  NoSymbolIcon, 
  LockOpenIcon,
  UserPlusIcon,
  UserMinusIcon,
  UserIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import AddPeopleModal from "../AddPeopleModal";
import AdminRemoveMembersModal from "./AdminRemoveMembersModal";
import AdminPromoteMemberModal from "./AdminPromoteMemberModal";
import AdminActionConfirmModal from "./AdminActionConfirmModal";

interface AdminWindowProps {
  activeTab: AdminTab;
}

export default function AdminWindow({ activeTab }: AdminWindowProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groupConversations, setGroupConversations] = useState<
    AdminGroupConversation[]
  >([]);
  const [usersPagination, setUsersPagination] = useState<PaginationInfo | null>(
    null
  );
  const [groupsPagination, setGroupsPagination] =
    useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Group chat action states
  const [selectedGroupChat, setSelectedGroupChat] = useState<AdminGroupConversation | null>(null);
  const [isAddPeopleModalOpen, setIsAddPeopleModalOpen] = useState(false);
  const [isRemoveMembersModalOpen, setIsRemoveMembersModalOpen] = useState(false);
  const [isPromoteMemberModalOpen, setIsPromoteMemberModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "remove" | "promote";
    data: string | string[];
  } | null>(null);

  useEffect(() => {
    setCurrentPage(1); // Reset page when tab changes
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === "users") {
          const response = await adminService.getAllUsers({
            page: currentPage,
            limit: 10,
          });
          setUsers(response.users);
          setUsersPagination(response.pagination);
        } else if (activeTab === "group-chats") {
          const response = await adminService.getAllGroupConversations({
            page: currentPage,
            limit: 10,
          });
          setGroupConversations(response.conversations);
          setGroupsPagination(response.pagination);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, currentPage]);

  const handleBlockUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminService.blockUser(userId);
      // Refresh the data
      const response = await adminService.getAllUsers({
        page: currentPage,
        limit: 10,
      });
      setUsers(response.users);
      setUsersPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminService.unblockUser(userId);
      // Refresh the data
      const response = await adminService.getAllUsers({
        page: currentPage,
        limit: 10,
      });
      setUsers(response.users);
      setUsersPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock user");
    } finally {
      setActionLoading(null);
    }
  };

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

  const handleMembersAdded = async () => {
    // Refresh the group conversations data
    try {
      const response = await adminService.getAllGroupConversations({
        page: currentPage,
        limit: 10,
      });
      setGroupConversations(response.conversations);
      setGroupsPagination(response.pagination);
    } catch (err) {
      console.error("Failed to refresh group conversations:", err);
    }
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

  const executeConfirmAction = async () => {
    if (!confirmAction || !selectedGroupChat) return;

    setActionLoading(selectedGroupChat.id);
    try {
      if (confirmAction.type === "remove") {
        await adminService.removeMembersFromGroup(
          selectedGroupChat.id,
          confirmAction.data as string[]
        );
      } else if (confirmAction.type === "promote") {
        await adminService.promoteGroupMember(
          selectedGroupChat.id,
          confirmAction.data as string
        );
      }

      // Refresh the data
      const response = await adminService.getAllGroupConversations({
        page: currentPage,
        limit: 10,
      });
      setGroupConversations(response.conversations);
      setGroupsPagination(response.pagination);
      
      setIsConfirmModalOpen(false);
      setConfirmAction(null);
      setSelectedGroupChat(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
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
  const convertAdminParticipantsToParticipants = (adminParticipants: AdminGroupConversation["participants"]) => {
    return adminParticipants.map(p => ({
      _id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      userName: p.userName,
      email: p.email,
    }));
  };

  const renderUsersTable = () => {
    if (loading) return <Loader size="lg" className="mx-auto" />;
    if (error) return <Alert color="red">{error}</Alert>;
    if (users.length === 0) return <p>No users found.</p>;

    const rows = users.map((user) => (
      <Table.Tr key={user.id}>
        <Table.Td>{user.userName}</Table.Td>
        <Table.Td>{user.firstName}</Table.Td>
        <Table.Td>{user.lastName}</Table.Td>
        <Table.Td>{user.email}</Table.Td>
        <Table.Td>
          {user.isBlocked ? (
            <LockOpenIcon 
              className={`size-6 text-green-500 cursor-pointer ${actionLoading === user.id ? 'opacity-50' : ''}`}
              onClick={() => handleUnblockUser(user.id)}
              title="Unblock user"
            />
          ) : (
            <NoSymbolIcon 
              className={`size-6 text-red-500 cursor-pointer ${actionLoading === user.id ? 'opacity-50' : ''}`}
              onClick={() => handleBlockUser(user.id)}
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
    if (loading) return <Loader size="lg" className="mx-auto" />;
    if (error) return <Alert color="red">{error}</Alert>;
    if (groupConversations.length === 0) return <p>No group chats found.</p>;

    const rows = groupConversations.map((conversation) => (
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
                disabled={actionLoading === conversation.id}
                loading={actionLoading === conversation.id}
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
    const pagination =
      activeTab === "users" ? usersPagination : groupsPagination;

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
    if (!confirmAction || !selectedGroupChat) return { title: "", message: "", confirmText: "", color: "blue" };
    
    if (confirmAction.type === "remove") {
      const userCount = confirmAction.data.length;
      return {
        title: "Confirm Remove Members",
        message: `Are you sure you want to remove ${userCount} member(s) from "${selectedGroupChat.groupName || "this group"}"? This action cannot be undone.`,
        confirmText: `Remove ${userCount} Member(s)`,
        color: "red",
      };
    } else if (confirmAction.type === "promote") {
      const selectedUser = selectedGroupChat.participants.find(p => p.id === confirmAction.data);
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
            existingParticipants={convertAdminParticipantsToParticipants(selectedGroupChat.participants)}
            onMembersAdded={handleMembersAdded}
          />

          <AdminRemoveMembersModal
            opened={isRemoveMembersModalOpen}
            onClose={closeAllModals}
            onConfirm={handleConfirmRemoveMembers}
            participants={convertAdminParticipantsToParticipants(selectedGroupChat.participants)}
            groupName={selectedGroupChat.groupName || "Unnamed Group"}
          />

          <AdminPromoteMemberModal
            opened={isPromoteMemberModalOpen}
            onClose={closeAllModals}
            onConfirm={handleConfirmPromoteMember}
            participants={convertAdminParticipantsToParticipants(selectedGroupChat.participants)}
            groupName={selectedGroupChat.groupName || "Unnamed Group"}
            currentAdminId={selectedGroupChat.groupAdmin?.id}
          />
        </>
      )}

      <AdminActionConfirmModal
        opened={isConfirmModalOpen}
        onClose={closeAllModals}
        onConfirm={executeConfirmAction}
        isLoading={actionLoading !== null}
        {...getConfirmMessage()}
      />
    </main>
  );
}
