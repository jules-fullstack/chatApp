import { type MessageTabProps } from "../../types";
import { Avatar, GroupAvatar } from "../ui";
import { useChatStore } from "../../store/chatStore";

export default function MessageTab({
  type = "default",
  username,
  lastMessage = "Lorem ipsum dolor sit amet consectetur adipisicing elit.",
  unreadCount = 0,
  isActive = false,
  onClick,
  user,
  groupParticipants,
  groupPhoto,
}: MessageTabProps) {
  const isDefault = type === "default";
  const { isUserOnline } = useChatStore();

  const isUserConnected = user ? isUserOnline(user._id) : false;

  return (
    <div
      className={`flex pl-2 py-2 cursor-pointer transition-colors duration-150 rounded-lg ${
        isActive ? "bg-blue-50 border-r-2 border-blue-500" : "hover:bg-gray-50"
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="relative">
        {groupParticipants && groupParticipants.length > 0 ? (
          <GroupAvatar
            participants={groupParticipants}
            size={isDefault ? "xl" : "lg"}
            className={isDefault ? "!w-16 !h-16" : ""}
            groupPhoto={groupPhoto}
          />
        ) : (
          <Avatar
            user={user}
            size={isDefault ? "xl" : "lg"}
            className={isDefault ? "!w-16 !h-16" : ""}
            showActiveStatus={true}
            isConnected={isUserConnected}
          />
        )}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-semibold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </div>
      <div
        className={
          isDefault
            ? "grid grid-rows-2 h-12 place-self-center ml-2 flex-1 min-w-0"
            : "flex items-center justify-start ml-2 flex-1 min-w-0"
        }
      >
        <h3
          className={`font-semibold truncate ${
            isDefault ? "" : "text-center"
          } ${unreadCount > 0 ? "text-gray-900" : "text-gray-700"}`}
        >
          {username}
        </h3>
        {isDefault && (
          <p
            className={`line-clamp-1 text-sm ${
              unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
            }`}
          >
            {lastMessage}
          </p>
        )}
      </div>
    </div>
  );
}
