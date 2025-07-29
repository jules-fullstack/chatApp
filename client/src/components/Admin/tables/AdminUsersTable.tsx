import { Table, Loader, Alert, Text } from "@mantine/core";
import { NoSymbolIcon, LockOpenIcon } from "@heroicons/react/24/outline";
import type { AdminUser } from "../../../types/admin";

interface AdminUsersTableProps {
  displayUsers: AdminUser[];
  isLoadingUsers: boolean;
  isErrorUsers: boolean;
  usersError: Error | null;
  isLoadingSearch: boolean;
  isSearchActive: boolean;
  actionLoading: string | null;
  onBlockUser: (userId: string) => void;
  onUnblockUser: (userId: string) => void;
  isBlockUserPending: boolean;
  isUnblockUserPending: boolean;
}

export function AdminUsersTable({
  displayUsers,
  isLoadingUsers,
  isErrorUsers,
  usersError,
  isLoadingSearch,
  isSearchActive,
  actionLoading,
  onBlockUser,
  onUnblockUser,
  isBlockUserPending,
  isUnblockUserPending,
}: AdminUsersTableProps) {
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
              isUnblockUserPending && actionLoading === user.id
                ? "opacity-50"
                : ""
            }`}
            onClick={() => onUnblockUser(user.id)}
            title="Unblock user"
          />
        ) : (
          <NoSymbolIcon
            className={`size-6 text-red-500 cursor-pointer ${
              isBlockUserPending && actionLoading === user.id
                ? "opacity-50"
                : ""
            }`}
            onClick={() => onBlockUser(user.id)}
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
}