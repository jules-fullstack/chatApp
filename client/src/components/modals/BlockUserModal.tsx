import { Modal, Button, Text } from "@mantine/core";
import { NoSymbolIcon } from "@heroicons/react/24/solid";

interface BlockUserModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  userName: string;
}

export default function BlockUserModal({
  opened,
  onClose,
  onConfirm,
  isLoading,
  userName,
}: BlockUserModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="bg-red-100 rounded-full p-2">
            <NoSymbolIcon className="size-5 text-red-600" />
          </div>
          <Text fw={600}>Block User</Text>
        </div>
      }
      centered
      size="sm"
    >
      <div className="space-y-4">
        <Text size="sm" c="dimmed">
          Are you sure you want to block <strong>{userName}</strong>?
        </Text>
        <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
          <li>They won't be able to message you</li>
          <li>You won't see their messages in group chats</li>
          <li>You can unblock them later if you change your mind</li>
        </ul>

        <div className="flex gap-3 justify-end">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={onConfirm}
            loading={isLoading}
            leftSection={<NoSymbolIcon className="size-4" />}
          >
            Block User
          </Button>
        </div>
      </div>
    </Modal>
  );
}
