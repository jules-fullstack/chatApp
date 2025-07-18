import { Modal, Button } from "@mantine/core";
import { UserIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface PromoteUserModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  userName: string;
}

export default function PromoteUserModal({
  opened,
  onClose,
  onConfirm,
  isLoading = false,
  userName,
}: PromoteUserModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Promote to Admin"
      size="sm"
      centered
    >
      <div className="space-y-4">
        {/* Warning Icon and Message */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-amber-100 rounded-full p-3">
            <ExclamationTriangleIcon className="size-8 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">
              Are you sure you want to promote this user?
            </h3>
            <p className="text-sm text-gray-600">
              This will demote you from your current admin status and make{" "}
              <span className="font-medium">{userName}</span> the new group admin.
            </p>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
          <div className="bg-blue-100 rounded-full p-2">
            <UserIcon className="size-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{userName}</p>
            <p className="text-sm text-gray-500">Will become group admin</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={isLoading} color="orange">
            Promote User
          </Button>
        </div>
      </div>
    </Modal>
  );
}