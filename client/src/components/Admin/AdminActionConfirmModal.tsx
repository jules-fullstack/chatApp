import { Modal } from "@mantine/core";
import AdminModalContainer from "./ui/AdminModalContainer";
import AdminModalDetails from "./ui/AdminModalDetails";
import AdminModalButtons from "./ui/AdminModalButtons";

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
    <Modal opened={opened} onClose={onClose} title={title} size="sm" centered>
      <AdminModalContainer>
        <AdminModalDetails title={title} message={message} color="amber" />
        <AdminModalButtons
          onClose={onClose}
          isLoading={isLoading}
          isCancelDisabled={isLoading}
          onConfirm={onConfirm}
          color={confirmColor}
        >
          {confirmText}
        </AdminModalButtons>
      </AdminModalContainer>
    </Modal>
  );
}
