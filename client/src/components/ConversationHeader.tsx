import { UserCircleIcon } from "@heroicons/react/24/outline";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/solid";
import { type Participant, type SearchedUser } from "../types";
import { useChatStore } from "../store/chatStore";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import FormField from "./ui/FormField";
import userSearchService from "../services/userSearchService";

interface ConversationHeaderProps {
  participant?: Participant;
  isTyping?: boolean;
}

interface SearchFormData {
  search: string;
}

export default function ConversationHeader({
  participant,
  isTyping,
}: ConversationHeaderProps) {
  const { isNewMessage, newMessageRecipient, setNewMessage, loadMessages } =
    useChatStore();
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SearchFormData>();

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
    // Set the new message recipient but stay in new message mode
    setNewMessage(true, user);
    // Load messages for this user (if any exist)
    loadMessages(user._id);
    // Clear search
    setValue("search", "");
    setShowResults(false);
    setSearchResults([]);
  };

  if (!participant && !isNewMessage) {
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

  if (isNewMessage && !newMessageRecipient) {
    return (
      <div className="relative">
        <div className="flex justify-between items-center shadow-xs p-2">
          <div className="flex-1">
            <FormField
              name="search"
              type="text"
              placeholder="To:"
              register={register}
              errors={errors}
              containerClassName="bg-gray-100 rounded-lg p-2 flex items-center"
              inputClassName="flex-1 focus:outline-none bg-transparent"
              leftIcon={<span className="text-gray-500 font-medium">To:</span>}
              showError={false}
            />
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
                      {user.firstName} {user.lastName}
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

  const displayParticipant = newMessageRecipient || participant;

  return (
    <div className="flex justify-between items-center shadow-xs p-2">
      <div className="flex">
        <UserCircleIcon className="size-12 text-gray-400" />
        <div className="grid grid-rows-2 h-12 place-self-center ml-2">
          <h3 className="font-semibold">
            {displayParticipant?.firstName} {displayParticipant?.lastName}
          </h3>
          <p className="text-gray-500 text-xs">
            {isTyping ? (
              <span className="text-green-500">typing...</span>
            ) : (
              "@" + displayParticipant?.userName
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
