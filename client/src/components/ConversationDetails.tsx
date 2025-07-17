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
} from "@heroicons/react/24/solid";
import { Accordion, Menu } from "@mantine/core";
import { useChatStore } from "../store/chatStore";
import Container from "./ui/Container";

export default function ConversationDetails() {
  const { activeConversation, conversations } = useChatStore();

  const conversation = conversations.find(
    (conversation) => conversation._id === activeConversation
  );

  const isGroup = conversation?.isGroup;

  console.log(isGroup);

  return (
    <Container size="sm">
      <div className="flex flex-col items-center">
        <UserCircleIcon className="size-28 text-gray-400 mt-2" />
        <p className="font-semibold text-blue-500">Username</p>
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
        <Accordion.Item value="customize-chat">
          <Accordion.Control>
            <p className="font-semibold">Customize chat</p>
          </Accordion.Control>

          {isGroup && (
            <div className="cursor-pointer hover:bg-gray-50">
              <Accordion.Panel>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-200 rounded-full p-2">
                    <PencilIcon className="size-4" />
                  </div>
                  <p className="font-medium">Change chat name</p>
                </div>
              </Accordion.Panel>
            </div>
          )}

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
        {isGroup && (
          <Accordion.Item value="chat-members">
            <Accordion.Control>
              <p className="font-semibold">Chat Members</p>
            </Accordion.Control>

            <div className="cursor-pointer hover:bg-gray-50">
              <Accordion.Panel>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1 items-center">
                    <UserCircleIcon className="size-12 text-gray-400" />
                    <p className="font-medium">Username</p>
                  </div>
                  <div className="rounded-full cursor-pointer hover:bg-gray-200 p-1">
                    <Menu position="bottom-end" width={250}>
                      <Menu.Target>
                        <EllipsisHorizontalIcon className="size-6" />
                      </Menu.Target>
                      <Menu.Dropdown className="!rounded-2xl !rounded-tr-sm">
                        <Menu.Item
                          leftSection={
                            <div className="bg-gray-200 rounded-full p-2">
                              <ChatBubbleOvalLeftIcon className="size-4" />
                            </div>
                          }
                        >
                          <span className="font-medium">Message</span>
                        </Menu.Item>
                        <Menu.Item
                          leftSection={
                            <div className="bg-gray-200 rounded-full p-2">
                              <UserIcon className="size-4" />
                            </div>
                          }
                        >
                          <span className="font-medium">Make Admin</span>
                        </Menu.Item>
                        <Menu.Item
                          leftSection={
                            <div className="bg-gray-200 rounded-full p-2">
                              <NoSymbolIcon className="size-4" />
                            </div>
                          }
                        >
                          <span className="font-medium">Block</span>
                        </Menu.Item>
                        <Menu.Item
                          leftSection={
                            <div className="bg-gray-200 rounded-full p-2">
                              <XMarkIcon className="size-4" />
                            </div>
                          }
                        >
                          <span className="font-medium">Remove from Group</span>
                        </Menu.Item>
                        <Menu.Item
                          leftSection={
                            <div className="bg-gray-200 rounded-full p-2">
                              <ArrowRightStartOnRectangleIcon className="size-4" />
                            </div>
                          }
                        >
                          <span className="font-medium">Leave Group</span>
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </div>
                </div>
              </Accordion.Panel>
            </div>
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
          </Accordion.Item>
        )}

        <Accordion.Item value="privacy-support">
          <Accordion.Control>
            <p className="font-semibold">Privacy & Support</p>
          </Accordion.Control>

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

          {isGroup && (
            <div className="cursor-pointer hover:bg-gray-50">
              <Accordion.Panel>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-200 rounded-full p-2">
                    <ArrowRightStartOnRectangleIcon className="size-4" />
                  </div>
                  <p className="font-medium">Leave Group</p>
                </div>
              </Accordion.Panel>
            </div>
          )}
        </Accordion.Item>
      </Accordion>
    </Container>
  );
}
