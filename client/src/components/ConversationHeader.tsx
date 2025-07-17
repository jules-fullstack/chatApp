import { UserCircleIcon } from "@heroicons/react/24/outline";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { type Participant, type SearchedUser } from "../types";
import { useChatStore } from "../store/chatStore";
import { userStore } from "../store/userStore";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import userSearchService from "../services/userSearchService";
import { Badge } from "@mantine/core";

interface ConversationHeaderProps {
  participant?: Participant;
  conversation?: {
    isGroup: boolean;
    groupName?: string;
    participants?: Array<{
      _id: string;
      firstName: string;
      lastName: string;
      userName: string;
    }>;
    participant?: {
      _id: string;
      firstName: string;
      lastName: string;
      userName: string;
    };
  };
  isTyping?: boolean;
}

interface SearchFormData {
  search: string;
}

export default function ConversationHeader({
  participant,
  conversation,
  isTyping,
}: ConversationHeaderProps) {
  const {
    isNewMessage,
    newMessageRecipients,
    addRecipient,
    removeRecipient,
    toggleConversationDetails,
  } = useChatStore();
  const { user: currentUser } = userStore();
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { register, watch, setValue } = useForm<SearchFormData>();

  const searchValue = watch("search");

  useEffect(() => {
    if (!isNewMessage || !searchValue?.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const searchUsers = async () => {
      try {
        setIsSearching(true);
        const users = await userSearchService.searchUsers(searchValue);
        setSearchResults(users);
        setShowResults(true);
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchValue, isNewMessage]);

  const handleUserSelect = (user: SearchedUser) => {
    // Add user to recipients
    addRecipient(user);

    // Don't try to load messages here - let the UI handle it properly
    // The conversation will be created when the first message is sent

    // Clear search
    setValue("search", "");
    setShowResults(false);
    setSearchResults([]);
  };

  const handleRemoveRecipient = (recipientId: string) => {
    removeRecipient(recipientId);
  };

  if (!participant && !conversation && !isNewMessage) {
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

  if (isNewMessage) {
    return (
      <div className="relative">
        <div className="flex justify-between items-center shadow-xs p-2">
          <div className="flex-1">
            <div className="bg-gray-100 rounded-lg p-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-500 font-medium">To:</span>

                {/* Selected Recipients as Badges */}
                {newMessageRecipients.map((recipient) => (
                  <Badge
                    key={recipient._id}
                    variant="filled"
                    color="blue"
                    rightSection={
                      <XMarkIcon
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => handleRemoveRecipient(recipient._id)}
                      />
                    }
                    className="cursor-pointer"
                  >
                    {recipient.userName}
                  </Badge>
                ))}

                {/* Search Input */}
                <input
                  {...register("search")}
                  type="text"
                  placeholder={
                    newMessageRecipients.length === 0
                      ? "Search users..."
                      : "Add more..."
                  }
                  className="flex-1 min-w-[120px] focus:outline-none bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {showResults && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
            {isSearching ? (
              <div className="p-4 text-center text-gray-500">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleUserSelect(user)}
                >
                  <UserCircleIcon className="size-10 text-gray-400 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {user.userName}
                    </div>
                    <div className="text-sm text-gray-500">
                      @{user.userName}
                    </div>
                  </div>
                </div>
              ))
            ) : searchValue?.trim() ? (
              <div className="p-4 text-center text-gray-500">
                No users found
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  const displayParticipant = participant;
  const recipientNames = newMessageRecipients
    .map((r) => r.firstName + " " + r.lastName)
    .join(", ");
  const recipientUsernames = newMessageRecipients
    .map((r) => r.userName)
    .join(", ");

  // For group chats, use conversation data
  const isGroupChat = conversation?.isGroup;
  const groupName = conversation?.groupName;
  const groupParticipants = conversation?.participants || [];

  // Get participant names for unnamed groups (excluding current user)
  const getGroupDisplayName = () => {
    if (groupName) return groupName;
    if (groupParticipants.length > 0 && currentUser) {
      // Filter out the current user from participants
      const otherParticipants = groupParticipants.filter(
        (p) => p._id !== currentUser.id
      );
      if (otherParticipants.length > 0) {
        return otherParticipants.map((p) => `${p.userName}`).join(", ");
      }
    }
    return "Group Chat";
  };

  return (
    <div className="flex justify-between items-center shadow-xs p-2">
      <div className="flex">
        <UserCircleIcon className="size-12 text-gray-400" />
        <div className="grid grid-rows-2 h-12 place-self-center ml-2">
          <h3 className="font-semibold">
            {isNewMessage && newMessageRecipients.length > 0
              ? `New Message to ${recipientNames}`
              : isGroupChat
                ? getGroupDisplayName()
                : `${displayParticipant?.userName}`}
          </h3>
          <p className="text-gray-500 text-xs">
            {isTyping ? (
              <span className="text-green-500">typing...</span>
            ) : isNewMessage && newMessageRecipients.length > 0 ? (
              `@${recipientUsernames}`
            ) : isGroupChat ? (
              `${groupParticipants.length} participants`
            ) : (
              "@" + displayParticipant?.userName
            )}
          </p>
        </div>
      </div>
      <div
        className="rounded-full cursor-pointer hover:bg-gray-200 p-1"
        onClick={toggleConversationDetails}
      >
        <EllipsisHorizontalIcon className="size-6" />
      </div>
    </div>
  );
}
