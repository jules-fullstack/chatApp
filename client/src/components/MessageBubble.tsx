import { format } from "date-fns";
import { userStore } from "../store/userStore";

interface Message {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    userName: string;
  };
  recipient: {
    _id: string;
    firstName: string;
    lastName: string;
    userName: string;
  };
  content: string;
  messageType: "text" | "image" | "file";
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  showTime?: boolean;
}

export default function MessageBubble({
  message,
  isLast = false,
  showTime = false,
}: MessageBubbleProps) {
  const currentUser = userStore.getState().user;
  const isOwnMessage = currentUser?.id === message.sender._id;

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm");
  };

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-1`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
          isOwnMessage
            ? "bg-blue-500 text-white rounded-br-md"
            : "bg-gray-200 text-gray-900 rounded-bl-md"
        } ${isLast ? "mb-2" : ""}`}
      >
        <p className="text-sm break-words">{message.content}</p>
        {showTime && (
          <div
            className={`text-xs mt-1 ${
              isOwnMessage ? "text-blue-100" : "text-gray-500"
            }`}
          >
            {formatTime(message.createdAt)}
            {isOwnMessage && message.isRead && <span className="ml-1">✓</span>}
          </div>
        )}
      </div>
    </div>
  );
}
