import { memo, useCallback } from "react";
import {
  EllipsisHorizontalIcon,
  NoSymbolIcon,
  ChatBubbleOvalLeftIcon,
  UserPlusIcon,
  UserIcon,
  XMarkIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/solid";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { Accordion, Menu } from "@mantine/core";
import { type Participant } from "../../types";
import { Avatar } from "../ui";

interface ConversationMembersProps {
  isGroup: boolean;
  isGroupAdmin: boolean;
  participants: Participant[];
  currentUserId?: string;
  blockedUsers: Set<string>;
  onMessageUser: (participant: Participant) => void;
  onOpenPromoteUserModal: (participant: Participant) => void;
  onOpenRemoveUserModal: (participant: Participant) => void;
  onOpenBlockUserModal: (participant: Participant) => void;
  onOpenUnblockUserModal: (participant: Participant) => void;
  onOpenLeaveGroupModal: () => void;
  onOpenAddPeopleModal: () => void;
  onOpenInviteUnregisteredModal: () => void;
}

export const ConversationMembers = memo(
  ({
    isGroup,
    isGroupAdmin,
    participants,
    currentUserId,
    blockedUsers,
    onMessageUser,
    onOpenPromoteUserModal,
    onOpenRemoveUserModal,
    onOpenBlockUserModal,
    onOpenUnblockUserModal,
    onOpenLeaveGroupModal,
    onOpenAddPeopleModal,
    onOpenInviteUnregisteredModal,
  }: ConversationMembersProps) => {
    const handleBlockAction = useCallback(
      (participant: Participant) => {
        if (blockedUsers.has(participant._id)) {
          onOpenUnblockUserModal(participant);
        } else {
          onOpenBlockUserModal(participant);
        }
      },
      [blockedUsers, onOpenBlockUserModal, onOpenUnblockUserModal]
    );

    const sortedParticipants = (participants || [])
      .slice()
      .sort((a, b) =>
        a.userName.localeCompare(b.userName, undefined, { sensitivity: "base" })
      );

    if (!isGroup) return null;

    return (
      <Accordion.Item value="chat-members">
        <Accordion.Control>
          <p className="font-semibold">Chat members</p>
        </Accordion.Control>

        {sortedParticipants.map((participant) => (
          <div
            key={participant._id}
            className="cursor-pointer hover:bg-gray-50"
          >
            <Accordion.Panel>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1 items-center">
                  <Avatar user={participant} size="lg" />
                  <p className="font-medium">{participant.userName}</p>
                </div>
                <div className="rounded-full cursor-pointer hover:bg-gray-200 p-1">
                  <Menu position="bottom-end" width={250}>
                    <Menu.Target>
                      <EllipsisHorizontalIcon className="size-6" />
                    </Menu.Target>
                    <Menu.Dropdown className="!rounded-2xl !rounded-tr-sm">
                      {participant._id === currentUserId ? (
                        <Menu.Item
                          leftSection={
                            <div className="bg-gray-200 rounded-full p-2">
                              <ArrowRightStartOnRectangleIcon className="size-4" />
                            </div>
                          }
                          onClick={onOpenLeaveGroupModal}
                        >
                          <span className="font-medium">Leave group</span>
                        </Menu.Item>
                      ) : (
                        <>
                          <Menu.Item
                            leftSection={
                              <div className="bg-gray-200 rounded-full p-2">
                                <ChatBubbleOvalLeftIcon className="size-4" />
                              </div>
                            }
                            onClick={() => onMessageUser(participant)}
                          >
                            <span className="font-medium">Message</span>
                          </Menu.Item>

                          {isGroupAdmin && (
                            <Menu.Item
                              leftSection={
                                <div className="bg-gray-200 rounded-full p-2">
                                  <UserIcon className="size-4" />
                                </div>
                              }
                              onClick={() =>
                                onOpenPromoteUserModal(participant)
                              }
                            >
                              <span className="font-medium">Make admin</span>
                            </Menu.Item>
                          )}

                          <Menu.Item
                            leftSection={
                              <div className="bg-gray-200 rounded-full p-2">
                                <NoSymbolIcon className="size-4" />
                              </div>
                            }
                            onClick={() => handleBlockAction(participant)}
                          >
                            <span className="font-medium">
                              {blockedUsers.has(participant._id)
                                ? "Unblock"
                                : "Block"}
                            </span>
                          </Menu.Item>

                          {isGroupAdmin && (
                            <Menu.Item
                              leftSection={
                                <div className="bg-gray-200 rounded-full p-2">
                                  <XMarkIcon className="size-4" />
                                </div>
                              }
                              onClick={() => onOpenRemoveUserModal(participant)}
                            >
                              <span className="font-medium">
                                Remove from group
                              </span>
                            </Menu.Item>
                          )}
                        </>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                </div>
              </div>
            </Accordion.Panel>
          </div>
        ))}

        {isGroupAdmin && (
          <>
            <div
              className="cursor-pointer hover:bg-gray-50"
              onClick={onOpenAddPeopleModal}
            >
              <Accordion.Panel>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-200 rounded-full p-2">
                    <UserPlusIcon className="size-4" />
                  </div>
                  <p className="font-medium">Add people</p>
                </div>
              </Accordion.Panel>
            </div>

            <div
              className="cursor-pointer hover:bg-gray-50"
              onClick={onOpenInviteUnregisteredModal}
            >
              <Accordion.Panel>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-200 rounded-full p-2">
                    <EnvelopeIcon className="size-4" />
                  </div>
                  <p className="font-medium">Invite unregistered users</p>
                </div>
              </Accordion.Panel>
            </div>
          </>
        )}
      </Accordion.Item>
    );
  }
);

ConversationMembers.displayName = "ConversationMembers";
