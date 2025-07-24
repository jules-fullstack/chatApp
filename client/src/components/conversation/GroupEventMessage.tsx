import { type Message } from "../../types";
import { getGroupEventText } from "../../utils/groupEventUtils";

interface GroupEventMessageProps {
  message: Message;
}

export default function GroupEventMessage({ message }: GroupEventMessageProps) {
  return (
    <div className="flex justify-center my-3">
      <div className="bg-gray-100 dark:bg-gray-200 px-4 py-2 rounded-full max-w-md">
        <p className="text-xs text-gray-600 dark:text-gray-800 text-center">
          {getGroupEventText(message)}
        </p>
      </div>
    </div>
  );
}
