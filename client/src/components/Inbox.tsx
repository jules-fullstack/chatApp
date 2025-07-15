import MessageTab from "./MessageTab";
import useUserSearchStore from "../store/userSearchStore";
import { useChatStore } from "../store/chatStore";
import { Loader } from "@mantine/core";
import { useEffect } from "react";

export default function Inbox() {
  const { searchedUsers, isSearching, isSearchActive, error, searchQuery } =
    useUserSearchStore();
  const {
    conversations,
    loadConversations,
    setActiveConversation,
    activeConversation,
    setFallbackParticipant,
    isNewMessage,
    newMessageRecipient,
    isConversationsLoading,
  } = useChatStore();

  useEffect(() => {
    if (!isSearchActive) {
      loadConversations();
    }
  }, [isSearchActive, loadConversations]);

  const handleUserClick = (userId: string) => {
    const user = searchedUsers.find((u) => u._id === userId);
    if (user) {
      setFallbackParticipant({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.userName,
      });
    }

    setActiveConversation(userId);
  };

  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader size={6} color="gray" />
          <span className="ml-2 text-gray-500">Searching...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-8">
          <span className="text-red-500 text-sm">{error}</span>
        </div>
      );
    }

    if (searchedUsers.length === 0 && searchQuery.trim()) {
      return (
        <div className="flex items-center justify-center py-8">
          <span className="text-gray-500 text-sm">No users found</span>
        </div>
      );
    }

    return searchedUsers.map((user) => (
      <MessageTab
        key={user._id}
        type="minimal"
        username={user.userName}
        isActive={activeConversation === user._id}
        onClick={() => handleUserClick(user._id)}
      />
    ));
  };

  const renderConversations = () => {
    const conversationsList = [];

    // Show new message tab if in new message mode
    if (isNewMessage) {
      const newMessageText = newMessageRecipient
        ? `New Message to ${newMessageRecipient.firstName} ${newMessageRecipient.lastName}`
        : "New Message";

      conversationsList.push(
        <MessageTab
          key="new-message"
          type="minimal"
          username={newMessageText}
          isActive={true}
          onClick={() => {}}
        />
      );
    }

    // Show regular conversations
    if (
      conversations.length === 0 &&
      !isNewMessage &&
      !isConversationsLoading
    ) {
      conversationsList.push(
        <div
          key="no-conversations"
          className="flex items-center justify-center py-8"
        >
          <span className="text-gray-500 text-sm">No conversations yet</span>
        </div>
      );
    } else {
      conversations.forEach((conversation) => {
        conversationsList.push(
          <MessageTab
            key={conversation._id}
            type="default"
            username={conversation.participant.userName}
            lastMessage={conversation.lastMessage?.content || "No messages yet"}
            unreadCount={conversation.unreadCount}
            isActive={
              !isNewMessage &&
              activeConversation === conversation.participant._id
            }
            onClick={() => {
              setFallbackParticipant(null);
              handleUserClick(conversation.participant._id);
            }}
          />
        );
      });
    }

    return conversationsList;
  };

  return (
    <div className="space-y-2 px-2">
      {isSearchActive ? renderSearchResults() : renderConversations()}
    </div>
  );
}
