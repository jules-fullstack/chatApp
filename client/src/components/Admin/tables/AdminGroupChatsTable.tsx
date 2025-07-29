import { Table, Loader, Alert, Button, Menu } from "@mantine/core";
import {
  UserPlusIcon,
  UserMinusIcon,
  UserIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import type { AdminGroupConversation } from "../../../types/admin";

interface AdminGroupChatsTableProps {
  groupChatsData: any;
  isLoadingGroupChats: boolean;
  isErrorGroupChats: boolean;
  groupChatsError: Error | null;
  actionLoading: string | null;
  isExecutePending: boolean;
  onAddPeople: (conversation: AdminGroupConversation) => void;
  onRemoveMembers: (conversation: AdminGroupConversation) => void;
  onPromoteMember: (conversation: AdminGroupConversation) => void;
}

export function AdminGroupChatsTable({
  groupChatsData,
  isLoadingGroupChats,
  isErrorGroupChats,
  groupChatsError,
  actionLoading,
  isExecutePending,
  onAddPeople,
  onRemoveMembers,
  onPromoteMember,
}: AdminGroupChatsTableProps) {
  if (isLoadingGroupChats) return <Loader size="lg" className="mx-auto" />;
  
  if (isErrorGroupChats)
    return (
      <Alert color="red">
        {groupChatsError?.message || "An error occurred"}
      </Alert>
    );
    
  if (!groupChatsData || groupChatsData.conversations.length === 0)
    return <p>No group chats found.</p>;

  const rows = groupChatsData.conversations.map((conversation: AdminGroupConversation) => (
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
              disabled={isExecutePending && actionLoading === conversation.id}
              loading={isExecutePending && actionLoading === conversation.id}
            >
              <EllipsisVerticalIcon className="size-4" />
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<UserPlusIcon className="size-4" />}
              onClick={() => onAddPeople(conversation)}
            >
              Add people to group
            </Menu.Item>
            <Menu.Item
              leftSection={<UserMinusIcon className="size-4" />}
              onClick={() => onRemoveMembers(conversation)}
              disabled={conversation.participants.length === 0}
            >
              Remove members
            </Menu.Item>
            <Menu.Item
              leftSection={<UserIcon className="size-4" />}
              onClick={() => onPromoteMember(conversation)}
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
}