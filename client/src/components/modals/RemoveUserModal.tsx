import { Modal, Button } from "@mantine/core";
import { UserMinusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface RemoveUserModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  userName: string;
}

export default function RemoveUserModal({
  opened,
  onClose,
  onConfirm,
  isLoading = false,
  userName,
}: RemoveUserModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Remove from Group"
      size="sm"
      centered
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-red-100 rounded-full p-3">
            <ExclamationTriangleIcon className="size-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">
              Are you sure you want to remove this user?
            </h3>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{userName}</span> will be removed from 
              the group and will no longer receive messages or have access to the conversation.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
          <div className="bg-red-100 rounded-full p-2">
            <UserMinusIcon className="size-5 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{userName}</p>
            <p className="text-sm text-gray-500">Will be removed from group</p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={isLoading} color="red">
            Remove User
          </Button>
        </div>
      </div>
    </Modal>
  );
}