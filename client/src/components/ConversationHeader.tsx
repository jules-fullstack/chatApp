import { UserCircleIcon } from "@heroicons/react/24/outline";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/solid";

export default function ConversationHeader() {
  return (
    <div className="flex justify-between items-center shadow-xs p-2">
      <div className="flex">
        <UserCircleIcon className="size-12" />
        <div className="grid grid-rows-2 h-12 place-self-center">
          <h3 className="font-semibold">Sample Name</h3>
          <p className="text-gray-500 text-xs">Active 1h ago</p>
        </div>
      </div>
      <div className="rounded-full cursor-pointer hover:bg-gray-200">
        <EllipsisHorizontalIcon className="size-6" />
      </div>
    </div>
  );
}
