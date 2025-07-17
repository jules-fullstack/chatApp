import MessageTab from "./MessageTab";
import useUserSearchStore from "../store/userSearchStore";
import { useChatStore } from "../store/chatStore";
import { userStore } from "../store/userStore";
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
    newMessageRecipients,
    isConversationsLoading,
  } = useChatStore();
  const { user: currentUser } = userStore();

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

    // Try to find existing conversation with this user
    const existingConversation = conversations.find(
      (conv) => !conv.isGroup && conv.participant?._id === userId
    );

    if (existingConversation) {
      setActiveConversation(existingConversation._id);
    } else {
      // For new conversations, we'll use a special format that the frontend can handle
      // The backend will create the conversation when the first message is sent
      setActiveConversation(`user:${userId}`);
    }
  };

  const handleConversationClick = (
    conversationId: string,
    participant?: {
      _id: string;
      firstName: string;
      lastName: string;
      userName: string;
      email: string;
    }
  ) => {
    if (participant) {
      setFallbackParticipant({
        _id: participant._id,
        firstName: participant.firstName,
        lastName: participant.lastName,
        userName: participant.userName,
      });
    } else {
      setFallbackParticipant(null);
    }
    setActiveConversation(conversationId);
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
      const newMessageText =
        newMessageRecipients.length > 0
          ? newMessageRecipients.length === 1
            ? `New Message to ${newMessageRecipients[0].userName}`
            : `New Message to ${newMessageRecipients.length} people`
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
        const displayName = conversation.isGroup
          ? conversation.groupName ||
            (conversation.participants &&
            conversation.participants.length > 0 &&
            currentUser
              ? conversation.participants
                  .filter((p) => p._id !== currentUser.id) // Filter out current user
                  .map((p) => `${p.userName}`)
                  .join(", ") || "Group Chat"
              : "Group Chat")
          : conversation.participant?.userName || "Unknown";

        conversationsList.push(
          <MessageTab
            key={conversation._id}
            type="default"
            username={displayName}
            lastMessage={conversation.lastMessage?.content || "No messages yet"}
            unreadCount={conversation.unreadCount}
            isActive={!isNewMessage && activeConversation === conversation._id}
            onClick={() => {
              handleConversationClick(
                conversation._id,
                conversation.isGroup ? undefined : conversation.participant
              );
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
