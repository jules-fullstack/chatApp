import { UserCircleIcon } from "@heroicons/react/24/outline";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/solid";
import { type Participant } from "../types";

interface ConversationHeaderProps {
  participant?: Participant;
  isTyping?: boolean;
}

export default function ConversationHeader({
  participant,
  isTyping,
}: ConversationHeaderProps) {
  if (!participant) {
    return (
      <div className="flex justify-between items-center shadow-xs p-2">
        <div className="flex">
          <UserCircleIcon className="size-12" />
          <div className="grid grid-rows-2 h-12 place-self-center">
            <h3 className="font-semibold">Select a conversation</h3>
            <p className="text-gray-500 text-xs">Choose someone to chat with</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center shadow-xs p-2">
      <div className="flex">
        <UserCircleIcon className="size-12 text-gray-400" />
        <div className="grid grid-rows-2 h-12 place-self-center ml-2">
          <h3 className="font-semibold">
            {participant.firstName} {participant.lastName}
          </h3>
          <p className="text-gray-500 text-xs">
            {isTyping ? (
              <span className="text-green-500">typing...</span>
            ) : (
              "@" + participant.userName
            )}
          </p>
        </div>
      </div>
      <div className="rounded-full cursor-pointer hover:bg-gray-200 p-1">
        <EllipsisHorizontalIcon className="size-6" />
      </div>
    </div>
  );
}
