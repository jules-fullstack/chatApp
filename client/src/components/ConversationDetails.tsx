import {
  UserCircleIcon,
  ChevronRightIcon,
  ArrowRightStartOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  PencilIcon,
  HandThumbUpIcon,
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
import Container from "./ui/Container";
import GroupNameModal from "./GroupNameModal";

export default function ConversationDetails() {
  const {
    activeConversation,
    conversations,
    updateGroupName,
    fallbackParticipant,
  } = useChatStore();
  const { user: currentUser } = userStore();
  const [isGroupNameModalOpen, setIsGroupNameModalOpen] = useState(false);

  const conversation = conversations.find(
    (conversation) => conversation._id === activeConversation
  );

  const isGroup = conversation?.isGroup;
  const isGroupAdmin = isGroup
    ? conversation.groupAdmin === currentUser?.id
    : "";

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

  return (
    <Container size="sm">
      <div className="flex flex-col items-center">
        <UserCircleIcon className="size-28 text-gray-400 mt-2" />
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

            <div className="cursor-pointer hover:bg-gray-50">
              <Accordion.Panel>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-200 rounded-full p-2">
                    <HandThumbUpIcon className="size-4 text-blue-500" />
                  </div>
                  <p className="font-medium">Change emoji</p>
                </div>
              </Accordion.Panel>
            </div>
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
                      <UserCircleIcon className="size-12 text-gray-400" />
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
              <div className="cursor-pointer hover:bg-gray-50">
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

          {!isGroup && (
            <div className="cursor-pointer hover:bg-gray-50">
              <Accordion.Panel>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-200 rounded-full p-2">
                    <NoSymbolIcon className="size-4" />
                  </div>
                  <p className="font-medium">Block</p>
                </div>
              </Accordion.Panel>
            </div>
          )}

          {isGroup && (
            <div className="cursor-pointer hover:bg-gray-50">
              <Accordion.Panel>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-200 rounded-full p-2">
                    <ArrowRightStartOnRectangleIcon className="size-4" />
                  </div>
                  <p className="font-medium">Leave group</p>
                </div>
              </Accordion.Panel>
            </div>
          )}
        </Accordion.Item>
      </Accordion>

      <GroupNameModal
        opened={isGroupNameModalOpen}
        onClose={handleCloseGroupNameModal}
        onConfirm={handleUpdateGroupName}
        mode="edit"
        currentGroupName={conversation?.groupName || ""}
      />
    </Container>
  );
}
