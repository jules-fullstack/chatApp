import { PencilSquareIcon } from "@heroicons/react/24/outline";
import SearchBar from "./SearchBar";
import Inbox from "./Inbox";
import Container from "./ui/Container";
import { useChatStore } from "../store/chatStore";

export default function Sidebar() {
  const { startNewMessage, toggleConversationDetails } = useChatStore();

  const handleNewMessageClick = () => {
    toggleConversationDetails();
    startNewMessage();
  };

  return (
    <Container size="sm">
      <div className="flex justify-between items-center px-4 py-2">
        <h2 className="text-gray-800 text-2xl/12 font-bold">Chats</h2>
        <div
          className="bg-gray-200 rounded-full p-1 hover:bg-gray-300 cursor-pointer"
          onClick={handleNewMessageClick}
        >
          <PencilSquareIcon className="size-6" />
        </div>
      </div>

      <div className="px-4">
        <SearchBar />
      </div>

      <div className="flex-1 overflow-y-auto mt-2">
        <Inbox />
      </div>
    </Container>
  );
}
