// client/src/components/MessageTab.tsx
import { UserCircleIcon } from "@heroicons/react/24/outline";

interface MessageTabProps {
  type?: "default" | "minimal";
  username: string;
  lastMessage?: string;
  onClick?: () => void;
}

export default function MessageTab({
  type = "default",
  username,
  lastMessage = "Lorem ipsum dolor sit amet consectetur adipisicing elit.",
  onClick,
}: MessageTabProps) {
  const isDefault = type === "default";

  return (
    <div
      className="flex pl-2 py-2 cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-lg"
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
      <UserCircleIcon
        className={`${isDefault ? "size-16" : "size-12"} text-gray-400`}
      />
      <div
        className={
          isDefault
            ? "grid grid-rows-2 h-12 place-self-center ml-2 flex-1 min-w-0"
            : "flex items-center justify-start ml-2 flex-1 min-w-0"
        }
      >
        <h3
          className={`font-semibold truncate ${isDefault ? "" : "text-center"}`}
        >
          {username}
        </h3>
        {isDefault && (
          <p className="text-gray-500 line-clamp-1 text-sm">{lastMessage}</p>
        )}
      </div>
    </div>
  );
}
