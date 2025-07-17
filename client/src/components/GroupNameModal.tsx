import { Modal, Button } from "@mantine/core";
import { useForm } from "react-hook-form";
import FormField from "./ui/FormField";

interface GroupNameFormData {
  groupName: string;
}

interface GroupNameModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (groupName: string) => void;
  participantNames: string[];
}

export default function GroupNameModal({
  opened,
  onClose,
  onConfirm,
  participantNames,
}: GroupNameModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GroupNameFormData>();

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

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
      title="Create Group Chat"
      centered
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Creating a group chat with: {participantNames.join(", ")}
          </p>
          
          <FormField
            name="groupName"
            type="text"
            placeholder="Enter group name (optional)"
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
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}