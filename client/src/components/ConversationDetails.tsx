import {
  ChevronRightIcon,
  ArrowRightStartOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  PencilIcon,
  EllipsisHorizontalIcon,
  NoSymbolIcon,
  ChatBubbleOvalLeftIcon,
  UserPlusIcon,
  UserIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import { Accordion, Menu } from "@mantine/core";
import { useState } from "react";
import { useChatStore } from "../store/chatStore";
import { userStore } from "../store/userStore";
import { type Participant } from "../types";
import Container from "./ui/Container";
import GroupNameModal from "./GroupNameModal";
import LeaveGroupModal from "./LeaveGroupModal";
import AddPeopleModal from "./AddPeopleModal";
import PromoteUserModal from "./PromoteUserModal";
import RemoveUserModal from "./RemoveUserModal";
import Avatar from "./ui/Avatar";
import GroupAvatar from "./ui/GroupAvatar";

export default function ConversationDetails() {
  const {
    activeConversation,
    conversations,
    updateGroupName,
    fallbackParticipant,
    leaveGroup,
    changeGroupAdmin,
    removeMemberFromGroup,
    setActiveConversation,
    setFallbackParticipant,
    setShowConversationDetails,
  } = useChatStore();
  const { user: currentUser } = userStore();
  const [isGroupNameModalOpen, setIsGroupNameModalOpen] = useState(false);
  const [isLeaveGroupModalOpen, setIsLeaveGroupModalOpen] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [isAddPeopleModalOpen, setIsAddPeopleModalOpen] = useState(false);
  const [isPromoteUserModalOpen, setIsPromoteUserModalOpen] = useState(false);
  const [userToPromote, setUserToPromote] = useState<Participant | null>(null);
  const [isPromotingUser, setIsPromotingUser] = useState(false);
  const [isRemoveUserModalOpen, setIsRemoveUserModalOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<Participant | null>(null);
  const [isRemovingUser, setIsRemovingUser] = useState(false);

  const conversation = conversations.find(
    (conversation) => conversation._id === activeConversation
  );

  const isGroup = conversation?.isGroup;
  const isGroupAdmin = isGroup
    ? conversation.groupAdmin?._id === currentUser?.id
    : false;

  const getConversationTitle = () => {
    if (!conversation && fallbackParticipant) {
      return fallbackParticipant.userName;
    }

    if (!conversation) return "";

    if (isGroup) {
      if (conversation.groupName) {
        return conversation.groupName;
      }
      // For group chats without a group name, show participant usernames excluding current user
      return (
        conversation.participants
          ?.filter((participant) => participant._id !== currentUser?.id)
          .map((participant) => participant.userName)
          .join(", ") || ""
      );
    } else {
      // For direct messages, show the other participant's username
      return conversation.participant?.userName || "";
    }
  };

  const getAvatarUser = () => {
    if (!conversation && fallbackParticipant) {
      return fallbackParticipant;
    }

    if (!conversation) return null;

    if (isGroup) {
      // For group chats, return null to show group avatar placeholder
      return null;
    } else {
      // For direct messages, show the other participant's avatar
      return conversation.participant || null;
    }
  };

  const handleOpenGroupNameModal = () => {
    setIsGroupNameModalOpen(true);
  };

  const handleCloseGroupNameModal = () => {
    setIsGroupNameModalOpen(false);
  };

  const handleUpdateGroupName = async (groupName: string) => {
    if (!conversation || !activeConversation) return;

    try {
      await updateGroupName(activeConversation, groupName);
    } catch (error) {
      console.error("Failed to update group name:", error);
    }
  };

  const handleOpenLeaveGroupModal = () => {
    setIsLeaveGroupModalOpen(true);
  };

  const handleCloseLeaveGroupModal = () => {
    setIsLeaveGroupModalOpen(false);
  };

  const handleLeaveGroup = async () => {
    if (!conversation || !activeConversation) return;

    setIsLeavingGroup(true);
    try {
      await leaveGroup(activeConversation);
    } catch (error) {
      console.error("Failed to leave group:", error);
    } finally {
      setIsLeavingGroup(false);
    }
  };

  const handleOpenAddPeopleModal = () => {
    setIsAddPeopleModalOpen(true);
  };

  const handleCloseAddPeopleModal = () => {
    setIsAddPeopleModalOpen(false);
  };

  const handleMembersAdded = (newMembers: Participant[]) => {
    // The WebSocket will handle updating the conversation
    // We could add additional logic here if needed
    console.log("Members added:", newMembers);
  };

  const handleOpenPromoteUserModal = (participant: Participant) => {
    setUserToPromote(participant);
    setIsPromoteUserModalOpen(true);
  };

  const handleClosePromoteUserModal = () => {
    setIsPromoteUserModalOpen(false);
    setUserToPromote(null);
  };

  const handlePromoteUser = async () => {
    if (!conversation || !activeConversation || !userToPromote) return;

    setIsPromotingUser(true);
    try {
      await changeGroupAdmin(activeConversation, userToPromote._id);
      handleClosePromoteUserModal();
    } catch (error) {
      console.error("Failed to change group admin:", error);
    } finally {
      setIsPromotingUser(false);
    }
  };

  const handleOpenRemoveUserModal = (participant: Participant) => {
    setUserToRemove(participant);
    setIsRemoveUserModalOpen(true);
  };

  const handleCloseRemoveUserModal = () => {
    setIsRemoveUserModalOpen(false);
    setUserToRemove(null);
  };

  const handleRemoveUser = async () => {
    if (!conversation || !activeConversation || !userToRemove) return;

    setIsRemovingUser(true);
    try {
      await removeMemberFromGroup(activeConversation, userToRemove._id);
      handleCloseRemoveUserModal();
    } catch (error) {
      console.error("Failed to remove user from group:", error);
    } finally {
      setIsRemovingUser(false);
    }
  };

  const handleMessageUser = (participant: Participant) => {
    setFallbackParticipant({
      _id: participant._id,
      firstName: participant.firstName,
      lastName: participant.lastName,
      userName: participant.userName,
      avatar: participant.avatar,
    });

    // Try to find existing conversation with this user
    const existingConversation = conversations.find(
      (conv) => !conv.isGroup && conv.participant?._id === participant._id
    );

    if (existingConversation) {
      setActiveConversation(existingConversation._id);
    } else {
      // For new conversations, we'll use a special format that the frontend can handle
      // The backend will create the conversation when the first message is sent
      setActiveConversation(`user:${participant._id}`);
    }

    // Close the conversation details panel
    setShowConversationDetails(false);
  };

  return (
    <Container size="sm">
      <div className="flex flex-col items-center">
        {isGroup ? (
          <div className="mt-2">
            <GroupAvatar 
              participants={conversation?.participants || []} 
              size="xl" 
              className="!w-28 !h-28" 
            />
          </div>
        ) : (
          <div className="mt-2">
            <Avatar user={getAvatarUser()} size="xl" className="!w-28 !h-28" />
          </div>
        )}
        <p className={`font-semibold ${!isGroup ? "text-blue-500" : ""}`}>
          {getConversationTitle()}
        </p>
      </div>

      <Accordion
        chevron={
          <ChevronRightIcon className="transition-transform duration-300" />
        }
        classNames={{
          chevron: "accordion-chevron",
          item: "no-bottom-border",
        }}
        multiple={true}
      >
        {isGroup && isGroupAdmin && (
          <Accordion.Item value="customize-chat">
            <Accordion.Control>
              <p className="font-semibold">Customize chat</p>
            </Accordion.Control>

            <div
              className="cursor-pointer hover:bg-gray-50"
              onClick={handleOpenGroupNameModal}
            >
              <Accordion.Panel>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-200 rounded-full p-2">
                    <PencilIcon className="size-4" />
                  </div>
                  <p className="font-medium">Change chat name</p>
                </div>
              </Accordion.Panel>
            </div>

            {isGroup && (
              <div className="cursor-pointer hover:bg-gray-50">
                <Accordion.Panel>
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-200 rounded-full p-2">
                      <PhotoIcon className="size-4" />
                    </div>
                    <p className="font-medium">Change photo</p>
                  </div>
                </Accordion.Panel>
              </div>
            )}
          </Accordion.Item>
        )}

        {isGroup && (
          <Accordion.Item value="chat-members">
            <Accordion.Control>
              <p className="font-semibold">Chat members</p>
            </Accordion.Control>

            {conversation.participants?.map((participant) => (
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
                          {participant._id === currentUser?.id ? (
                            <Menu.Item
                              leftSection={
                                <div className="bg-gray-200 rounded-full p-2">
                                  <ArrowRightStartOnRectangleIcon className="size-4" />
                                </div>
                              }
                              onClick={handleOpenLeaveGroupModal}
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
                                onClick={() => handleMessageUser(participant)}
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
                                    handleOpenPromoteUserModal(participant)
                                  }
                                >
                                  <span className="font-medium">
                                    Make admin
                                  </span>
                                </Menu.Item>
                              )}

                              <Menu.Item
                                leftSection={
                                  <div className="bg-gray-200 rounded-full p-2">
                                    <NoSymbolIcon className="size-4" />
                                  </div>
                                }
                              >
                                <span className="font-medium">Block</span>
                              </Menu.Item>

                              {isGroupAdmin && (
                                <Menu.Item
                                  leftSection={
                                    <div className="bg-gray-200 rounded-full p-2">
                                      <XMarkIcon className="size-4" />
                                    </div>
                                  }
                                  onClick={() =>
                                    handleOpenRemoveUserModal(participant)
                                  }
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
              <div
                className="cursor-pointer hover:bg-gray-50"
                onClick={handleOpenAddPeopleModal}
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
            )}
          </Accordion.Item>
        )}

        <Accordion.Item value="privacy-support">
          <Accordion.Control>
            <p className="font-semibold">Privacy & support</p>
          </Accordion.Control>

          <div
            className="cursor-pointer hover:bg-gray-50"
            onClick={isGroup ? handleOpenLeaveGroupModal : undefined}
          >
            <Accordion.Panel>
              <div className="flex items-center gap-2">
                <div className="bg-gray-200 rounded-full p-2">
                  {isGroup ? (
                    <ArrowRightStartOnRectangleIcon className="size-4" />
                  ) : (
                    <NoSymbolIcon className="size-4" />
                  )}
                </div>
                <p className="font-medium">
                  {isGroup ? "Leave Group" : "Block"}
                </p>
              </div>
            </Accordion.Panel>
          </div>
        </Accordion.Item>
      </Accordion>

      <GroupNameModal
        opened={isGroupNameModalOpen}
        onClose={handleCloseGroupNameModal}
        onConfirm={handleUpdateGroupName}
        mode="edit"
        currentGroupName={conversation?.groupName || ""}
      />

      <LeaveGroupModal
        opened={isLeaveGroupModalOpen}
        onClose={handleCloseLeaveGroupModal}
        onConfirm={handleLeaveGroup}
        isLoading={isLeavingGroup}
      />

      {conversation && isGroup && (
        <AddPeopleModal
          opened={isAddPeopleModalOpen}
          onClose={handleCloseAddPeopleModal}
          conversationId={conversation._id}
          existingParticipants={conversation.participants || []}
          onMembersAdded={handleMembersAdded}
        />
      )}

      {userToPromote && (
        <PromoteUserModal
          opened={isPromoteUserModalOpen}
          onClose={handleClosePromoteUserModal}
          onConfirm={handlePromoteUser}
          isLoading={isPromotingUser}
          userName={userToPromote.userName}
        />
      )}

      {userToRemove && (
        <RemoveUserModal
          opened={isRemoveUserModalOpen}
          onClose={handleCloseRemoveUserModal}
          onConfirm={handleRemoveUser}
          isLoading={isRemovingUser}
          userName={userToRemove.userName}
        />
      )}
    </Container>
  );
}
