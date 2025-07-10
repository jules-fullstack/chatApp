import { PencilSquareIcon } from "@heroicons/react/24/outline";
import SearchBar from "./SearchBar";
import MessagesList from "./MessagesList";
import Container from "./ui/Container";

export default function ChatsMenu() {
  return (
    <Container size="sm">
      <div className="flex justify-between items-center px-4 py-2">
        <h2 className="text-gray-800 text-2xl/12 font-bold">Chats</h2>
        <div className="bg-gray-200 rounded-full p-1 hover:bg-gray-300">
          <PencilSquareIcon className="size-6 cursor-pointer" />
        </div>
      </div>

      <div className="px-4">
        <SearchBar />
      </div>

      <div className="flex-1 overflow-y-auto mt-2">
        <MessagesList />
      </div>
    </Container>
  );
}
