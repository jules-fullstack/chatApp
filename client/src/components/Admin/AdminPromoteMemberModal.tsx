import { useState, useEffect } from "react";
import { Modal, Button, Radio, ScrollArea } from "@mantine/core";
import { ExclamationTriangleIcon, UserIcon } from "@heroicons/react/24/outline";
import type { Participant } from "../../types";
import Avatar from "../ui/Avatar";

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

  const selectedUser = participants.find(p => p._id === selectedUserId);
  const eligibleParticipants = participants.filter(p => p._id !== currentAdminId);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Promote Member to Admin"
      size="md"
      centered
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-amber-100 rounded-full p-3">
            <ExclamationTriangleIcon className="size-8 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">
              Promote member in "{groupName}"
            </h3>
            <p className="text-sm text-gray-600">
              Select a member to promote to admin. This will give them administrative
              privileges in this group.
            </p>
          </div>
        </div>

        {/* Member Selection */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Choose a member:</h4>
          <ScrollArea className="h-64 border rounded-lg p-2">
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
          </ScrollArea>
        </div>

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
                {selectedUser.firstName} {selectedUser.lastName} (@{selectedUser.userName})
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            loading={isLoading}
            color="orange"
            disabled={!selectedUserId}
          >
            Promote Member
          </Button>
        </div>
      </div>
    </Modal>
  );
}