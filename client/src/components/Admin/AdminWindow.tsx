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
} from "@mantine/core";
import Container from "../ui/Container";
import type { AdminTab } from "./AdminSidebar";
import adminService from "../../services/adminService";
import type {
  AdminUser,
  AdminGroupConversation,
  PaginationInfo,
} from "../../types/admin";
import { NoSymbolIcon } from "@heroicons/react/24/outline";

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
          <NoSymbolIcon className="size-6 text-red-500 cursor-pointer" />
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
        <Table.Td>{/* Actions will be added later */}</Table.Td>
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
    </main>
  );
}
