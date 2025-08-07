import { useState, useEffect } from "react";
import { Modal, Checkbox } from "@mantine/core";
import { UserMinusIcon } from "@heroicons/react/24/outline";
import type { Participant } from "../../types";
import { Avatar } from "../ui";
import AdminModalContainer from "./ui/AdminModalContainer";
import AdminModalDetails from "./ui/AdminModalDetails";
import AdminModalScrollArea from "./ui/AdminModalScrollArea";
import AdminModalButtons from "./ui/AdminModalButtons";

interface AdminRemoveMembersModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (userIds: string[]) => void;
  isLoading?: boolean;
  participants: Participant[];
  groupName: string;
}

export default function AdminRemoveMembersModal({
  opened,
  onClose,
  onConfirm,
  isLoading = false,
  participants,
  groupName,
}: AdminRemoveMembersModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (opened) {
      setSelectedUsers([]);
    }
  }, [opened]);

  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId]);
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedUsers);
  };

  const selectedUserNames = participants
    .filter((p) => selectedUsers.includes(p._id))
    .map((p) => p.userName);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Remove Members from Group"
      size="md"
      centered
    >
      <AdminModalContainer>
        <AdminModalDetails
          title={`Remove members from "${groupName}"`}
          message="Select the members you want to remove from this group. They will
              no longer have access to the conversation."
          color="red"
        />

        {/* Member Selection */}
        <AdminModalScrollArea title="Group Members:">
          <div className="space-y-2">
            {participants.map((participant) => {
              const isSelected = selectedUsers.includes(participant._id);
              return (
                <div
                  key={participant._id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={(event) =>
                      handleUserSelect(
                        participant._id,
                        event.currentTarget.checked
                      )
                    }
                  />
                  <Avatar user={participant} size="md" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {participant.firstName} {participant.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      @{participant.userName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </AdminModalScrollArea>

        {/* Selected Users Summary */}
        {selectedUsers.length > 0 && (
          <div className="bg-red-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <UserMinusIcon className="size-5 text-red-600" />
              <span className="font-medium text-red-900">
                {selectedUsers.length} member(s) will be removed:
              </span>
            </div>
            <p className="text-sm text-red-700">
              {selectedUserNames.join(", ")}
            </p>
          </div>
        )}

        <AdminModalButtons
          onClose={onClose}
          isLoading={isLoading}
          isCancelDisabled={isLoading}
          isConfirmDisabled={selectedUsers.length === 0}
          onConfirm={handleConfirm}
          color="red"
        >
          Remove {selectedUsers.length}{" "}
          {selectedUsers.length === 1 ? "Member" : "Members"}
        </AdminModalButtons>
      </AdminModalContainer>
    </Modal>
  );
}
