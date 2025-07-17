import { Modal, Button } from "@mantine/core";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import FormField from "./ui/FormField";

interface GroupNameFormData {
  groupName: string;
}

interface GroupNameModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (groupName: string) => void;
  participantNames?: string[];
  mode?: 'create' | 'edit';
  currentGroupName?: string;
}

export default function GroupNameModal({
  opened,
  onClose,
  onConfirm,
  participantNames = [],
  mode = 'create',
  currentGroupName = '',
}: GroupNameModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<GroupNameFormData>({
    defaultValues: {
      groupName: currentGroupName,
    },
  });

  // Update form values when modal opens or currentGroupName changes
  useEffect(() => {
    if (opened) {
      setValue('groupName', currentGroupName);
    }
  }, [opened, currentGroupName, setValue]);

  const onSubmit = (data: GroupNameFormData) => {
    const groupName = data.groupName?.trim() || "";
    onConfirm(groupName);
    reset();
    onClose();
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const isEditMode = mode === 'edit';
  const modalTitle = isEditMode ? "Change Chat Name" : "Create Group Chat";
  const buttonText = isEditMode ? "Save" : "Create";
  const placeholder = isEditMode 
    ? "Enter group name" 
    : "Enter group name (optional)";

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
      title={modalTitle}
      centered
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          {!isEditMode && (
            <p className="text-sm text-gray-600 mb-3">
              Creating a group chat with: {participantNames.join(", ")}
            </p>
          )}
          
          <FormField
            name="groupName"
            type="text"
            placeholder={placeholder}
            register={register}
            errors={errors}
            containerClassName="bg-gray-100 rounded-lg p-3"
            inputClassName="w-full focus:outline-none bg-transparent"
            showError={true}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {buttonText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}