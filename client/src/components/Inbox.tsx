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
    if (conversations.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <span className="text-gray-500 text-sm">No conversations yet</span>
        </div>
      );
    }

    return conversations.map((conversation) => (
      <MessageTab
        key={conversation._id}
        type="default"
        username={conversation.participant.userName}
        lastMessage={conversation.lastMessage?.content || "No messages yet"}
        unreadCount={conversation.unreadCount}
        isActive={activeConversation === conversation.participant._id}
        onClick={() => {
          setFallbackParticipant(null);
          handleUserClick(conversation.participant._id);
        }}
      />
    ));
  };

  return (
    <div className="space-y-2 px-2">
      {isSearchActive ? renderSearchResults() : renderConversations()}
    </div>
  );
}
