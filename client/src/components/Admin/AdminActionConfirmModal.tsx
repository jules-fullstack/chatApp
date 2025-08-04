import { Modal, Button } from "@mantine/core";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface AdminActionConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmColor?: string;
}

export default function AdminActionConfirmModal({
  opened,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  message,
  confirmText,
  confirmColor = "blue",
}: AdminActionConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size="sm"
      centered
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-amber-100 rounded-full p-3">
            <ExclamationTriangleIcon className="size-8 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">
              {title}
            </h3>
            <p className="text-sm text-gray-600">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={isLoading} color={confirmColor}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}