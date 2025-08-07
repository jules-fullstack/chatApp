import { useState, useEffect } from "react";
import { Modal, Radio } from "@mantine/core";
import { UserIcon } from "@heroicons/react/24/outline";
import type { Participant } from "../../types";
import { Avatar } from "../ui";
import AdminModalContainer from "./ui/AdminModalContainer";
import AdminModalDetails from "./ui/AdminModalDetails";
import AdminModalScrollArea from "./ui/AdminModalScrollArea";
import AdminModalButtons from "./ui/AdminModalButtons";

interface AdminPromoteMemberModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => void;
  isLoading?: boolean;
  participants: Participant[];
  groupName: string;
  currentAdminId?: string;
}

export default function AdminPromoteMemberModal({
  opened,
  onClose,
  onConfirm,
  isLoading = false,
  participants,
  groupName,
  currentAdminId,
}: AdminPromoteMemberModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    if (opened) {
      setSelectedUserId("");
    }
  }, [opened]);

  const handleConfirm = () => {
    if (selectedUserId) {
      onConfirm(selectedUserId);
    }
  };

  const selectedUser = participants.find((p) => p._id === selectedUserId);
  const eligibleParticipants = participants.filter(
    (p) => p._id !== currentAdminId
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Promote Member to Admin"
      size="md"
      centered
    >
      <AdminModalContainer>
        <AdminModalDetails
          title={`Promote member in "${groupName}"`}
          message="Select a member to promote to admin. This will give them
              administrative privileges in this group."
          color="amber"
        />

        {/* Member Selection */}
        <AdminModalScrollArea title="Choose a member:">
          <Radio.Group value={selectedUserId} onChange={setSelectedUserId}>
            <div className="space-y-2">
              {eligibleParticipants.map((participant) => (
                <div
                  key={participant._id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg"
                >
                  <Radio value={participant._id} />
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
              ))}
            </div>
          </Radio.Group>
        </AdminModalScrollArea>

        {/* Selected User Summary */}
        {selectedUser && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="size-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                Will be promoted to admin:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar user={selectedUser} size="sm" />
              <span className="text-sm text-blue-700">
                {selectedUser.firstName} {selectedUser.lastName} (@
                {selectedUser.userName})
              </span>
            </div>
          </div>
        )}

        <AdminModalButtons
          onClose={onClose}
          isLoading={isLoading}
          isCancelDisabled={isLoading}
          isConfirmDisabled={!selectedUserId}
          onConfirm={handleConfirm}
          color="orange"
        >
          Promote Member
        </AdminModalButtons>
      </AdminModalContainer>
    </Modal>
  );
}
