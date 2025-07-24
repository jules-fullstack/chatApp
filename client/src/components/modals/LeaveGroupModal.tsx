import { Modal, Button } from "@mantine/core";

interface LeaveGroupModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function LeaveGroupModal({
  opened,
  onClose,
  onConfirm,
  isLoading = false,
}: LeaveGroupModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Leave group chat?"
      centered
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-gray-600">
          You will stop receiving messages from this conversation and people will see that you left
        </p>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            color="red" 
            loading={isLoading}
            disabled={isLoading}
          >
            Leave group
          </Button>
        </div>
      </div>
    </Modal>
  );
}