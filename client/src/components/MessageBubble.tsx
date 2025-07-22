import { userStore } from "../store/userStore";
import { useChatStore } from "../store/chatStore";
import { type Message, type Conversation } from "../types";
import { useState } from "react";
import ImageModal from "./ImageModal";
import Avatar from "./ui/Avatar";

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
  conversation?: Conversation;
  usersWhoLastReadThisMessage?: string[]; // Array of user IDs who last read this specific message
  showAvatar?: boolean; // Whether to show avatar for this message
}

export default function MessageBubble({
  message,
  isLast = false,
  conversation,
  usersWhoLastReadThisMessage = [],
  showAvatar = false,
}: MessageBubbleProps) {
  const currentUser = userStore.getState().user;
  const { isUserBlockedByMe, amIBlockedByUser } = useChatStore();
  const isOwnMessage = currentUser?.id === message.sender._id;
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setModalOpened(true);
  };

  // Get read status - only show avatars for users who last read this specific message
  const getReadStatus = () => {
    if (!isOwnMessage || !conversation)
      return { hasBeenRead: false, readByUsers: [] };

    const readByUsers: {
      userId: string;
      user: {
        _id: string;
        userName?: string;
        firstName?: string;
        avatar?: import("../types").Media | string;
      };
    }[] = [];

    if (conversation.isGroup) {
      // For group chats, only show avatars for users who last read THIS specific message
      // and filter out blocked users (both directions)
      conversation.participants?.forEach((participant) => {
        if (
          participant._id !== currentUser?.id &&
          usersWhoLastReadThisMessage.includes(participant._id) &&
          !isUserBlockedByMe(participant._id) && // Don't show users I've blocked
          !amIBlockedByUser(participant._id) // Don't show users who have blocked me
        ) {
          readByUsers.push({ userId: participant._id, user: participant });
        }
      });
      return { hasBeenRead: readByUsers.length > 0, readByUsers };
    } else {
      // For direct messages, check if this is the last read message for the other participant
      // Also check blocking status - don't show read status if either user has blocked the other
      const otherParticipant = conversation.participant;
      if (
        otherParticipant &&
        usersWhoLastReadThisMessage.includes(otherParticipant._id) &&
        !isUserBlockedByMe(otherParticipant._id) && // Don't show if I've blocked them
        !amIBlockedByUser(otherParticipant._id) // Don't show if they've blocked me
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

  return (
    <>
      <div
        className={`flex items-end ${isOwnMessage ? "justify-end" : "justify-start"} mb-1`}
      >
        {/* Avatar for other users' messages */}
        {!isOwnMessage && showAvatar && (
          <Avatar user={message.sender} size="sm" className="!w-8 !h-8 flex-shrink-0 mr-2" />
        )}
        {/* Spacer when not showing avatar to maintain alignment */}
        {!isOwnMessage && !showAvatar && <div className="flex-shrink-0 w-10" />}

        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
            isOwnMessage
              ? "bg-blue-500 text-white rounded-br-md"
              : "bg-gray-200 text-gray-900 rounded-bl-md"
          } ${isLast ? "mb-2" : ""}`}
        >
          {message.content && message.content.trim() && (
            <p className="text-sm break-words">{message.content}</p>
          )}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 space-y-1">
              {message.attachments
                .filter((attachment) =>
                  attachment.mimeType.startsWith("image/")
                )
                .map((attachment, index) => (
                  <img
                    key={attachment._id}
                    src={attachment.url}
                    alt={attachment.metadata?.alt || `Image ${index + 1}`}
                    className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleImageClick(index)}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
      {/* Read status with user avatars - only show for users who last read this specific message */}
      {isOwnMessage && hasBeenRead && readByUsers.length > 0 && (
        <div className="flex justify-end mb-1">
          <div className="flex items-center space-x-1">
            {readByUsers.slice(0, 3).map(({ userId, user }) => (
              <Avatar
                key={userId}
                user={user}
                size="sm"
                className="!w-4 !h-4"
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

      {/* Image Modal */}
      {message.attachments && message.attachments.length > 0 && (
        <ImageModal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          images={message.attachments
            .filter((attachment) => attachment.mimeType.startsWith("image/"))
            .map((attachment) => attachment.url)}
          initialIndex={selectedImageIndex}
        />
      )}
    </>
  );
}
