import { Modal, Button, Text } from "@mantine/core";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

interface UnblockUserModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  userName: string;
}

export default function UnblockUserModal({
  opened,
  onClose,
  onConfirm,
  isLoading,
  userName,
}: UnblockUserModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="bg-green-100 rounded-full p-2">
            <CheckCircleIcon className="size-5 text-green-600" />
          </div>
          <Text fw={600}>Unblock User</Text>
        </div>
      }
      centered
      size="sm"
    >
      <div className="space-y-4">
        <Text size="sm" c="dimmed">
          Are you sure you want to unblock <strong>{userName}</strong>?
        </Text>
        <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
          <li>They will be able to message you again </li>{" "}
          <li>You will see their messages in group chats </li>
          <li>You can block them again if needed</li>
        </ul>

        <div className="flex gap-3 justify-end">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            color="green"
            onClick={onConfirm}
            loading={isLoading}
            leftSection={<CheckCircleIcon className="size-4" />}
          >
            Unblock User
          </Button>
        </div>
      </div>
    </Modal>
  );
}
