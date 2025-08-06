import { Button } from "@mantine/core";
import type { ReactNode } from "react";

export default function AdminModalButtons({
  onClose,
  isLoading,
  onConfirm,
  color,
  isCancelDisabled,
  isConfirmDisabled = false,
  children,
}: {
  onClose: () => void;
  isLoading: boolean;
  onConfirm: () => void;
  color: string;
  isCancelDisabled: boolean;
  isConfirmDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-end space-x-2 pt-2">
      <Button variant="outline" onClick={onClose} disabled={isCancelDisabled}>
        Cancel
      </Button>
      <Button
        onClick={onConfirm}
        loading={isLoading}
        color={color}
        disabled={isConfirmDisabled}
      >
        {children}
      </Button>
    </div>
  );
}
