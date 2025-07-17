import { format } from "date-fns";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { userStore } from "../store/userStore";
import { type Message, type Conversation } from "../types";

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  showTime?: boolean;
  conversation?: Conversation;
  usersWhoLastReadThisMessage?: string[]; // Array of user IDs who last read this specific message
}

export default function MessageBubble({
  message,
  isLast = false,
  showTime = false,
  conversation,
  usersWhoLastReadThisMessage = [],
}: MessageBubbleProps) {
  const currentUser = userStore.getState().user;
  const isOwnMessage = currentUser?.id === message.sender._id;

  // Get read status - only show avatars for users who last read this specific message
  const getReadStatus = () => {
    if (!isOwnMessage || !conversation)
      return { hasBeenRead: false, readByUsers: [] };

    const readByUsers: {
      userId: string;
      user: { _id: string; userName?: string; firstName?: string };
    }[] = [];

    if (conversation.isGroup) {
      // For group chats, only show avatars for users who last read THIS specific message
      conversation.participants?.forEach((participant) => {
        if (
          participant._id !== currentUser?.id &&
          usersWhoLastReadThisMessage.includes(participant._id)
        ) {
          readByUsers.push({ userId: participant._id, user: participant });
        }
      });
      return { hasBeenRead: readByUsers.length > 0, readByUsers };
    } else {
      // For direct messages, check if this is the last read message for the other participant
      const otherParticipant = conversation.participant;
      if (
        otherParticipant &&
        usersWhoLastReadThisMessage.includes(otherParticipant._id)
      ) {
        return {
          hasBeenRead: true,
          readByUsers: [
            { userId: otherParticipant._id, user: otherParticipant },
          ],
        };
      }
    }

    return { hasBeenRead: false, readByUsers: [] };
  };

  const { hasBeenRead, readByUsers } = getReadStatus();

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm");
  };

  return (
    <>
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
            </div>
          )}
        </div>
      </div>
      {/* Read status with user avatars - only show for users who last read this specific message */}
      {isOwnMessage && hasBeenRead && readByUsers.length > 0 && (
        <div className="flex justify-end mb-1">
          <div className="flex items-center space-x-1">
            {readByUsers.slice(0, 3).map(({ userId, user }) => (
              <UserCircleIcon
                key={userId}
                className="size-4 text-gray-400"
                title={`Read by ${user.userName}`}
              />
            ))}
            {readByUsers.length > 3 && (
              <span className="text-xs text-gray-500">
                +{readByUsers.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
