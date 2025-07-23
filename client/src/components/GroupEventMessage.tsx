import { type Message } from "../types";

interface GroupEventMessageProps {
  message: Message;
}

export default function GroupEventMessage({ message }: GroupEventMessageProps) {
  const getEventText = (): string => {
    const senderName = `${message.sender.userName}`;
    const targetName = message.groupEventData?.targetUser
      ? `${message.groupEventData.targetUser.userName}`
      : "";

    switch (message.groupEventType) {
      case "nameChange":
        return `${senderName} changed the chat name to "${message.groupEventData?.newValue}"`;

      case "photoChange":
        return `${senderName} changed the group photo`;

      case "userLeft":
        return `${senderName} left the group`;

      case "userPromoted":
        return `${senderName} promoted ${targetName} to admin`;

      case "userRemoved":
        return `${senderName} removed ${targetName} from the group`;

      case "userAdded":
        return `${senderName} added ${targetName} to the group`;

      case "userJoinedViaInvitation":
        return `${senderName} joined the group via invitation`;

      default:
        return "Group event occurred";
    }
  };

  return (
    <div className="flex justify-center my-3">
      <div className="bg-gray-100 dark:bg-gray-200 px-4 py-2 rounded-full max-w-md">
        <p className="text-xs text-gray-600 dark:text-gray-800 text-center">
          {getEventText()}
        </p>
      </div>
    </div>
  );
}
