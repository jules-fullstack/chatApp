import { useEffect, useRef, useCallback } from "react";
import ConversationHeader from "./ConversationHeader";
import MessageSender from "./MessageSender";
import MessageBubble from "./MessageBubble";
import TimestampSeparator from "./TimestampSeparator";
import Container from "./ui/Container";
import { useChatStore } from "../store/chatStore";
import { useConversationStore } from "../store/conversationStore";
import { userStore } from "../store/userStore";
import { useConversationRead } from "../hooks/useMessageRead";
import { shouldShowTimeSeparator } from "../utils/dateUtils";
import { Loader } from "@mantine/core";
import { useIntersectionObserverCallback } from "../hooks/useIntersectionObserver";

export default function MessageWindow() {
  const { getTypingUsersForConversation, isUserBlockedByMe, amIBlockedByUser } =
    useChatStore();

  const {
    activeConversation,
    messages,
    conversations,
    fallbackParticipant,
    isNewMessage,
    newMessageRecipients,
    isMessagesLoading,
    hasMoreMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
  } = useConversationStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(messages.length);
  const shouldAutoScrollRef = useRef(true);

  // Use intersection observer to mark conversation as read when visible
  const { ref: conversationRef } = useConversationRead(
    activeConversation || "",
    !!activeConversation
  );

  const scrollToBottom = useCallback((smooth = true) => {
    if (!messagesEndRef.current) return;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "instant",
        block: "end",
      });
    });
  }, []);

  const scrollToBottomInstant = useCallback(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  // Load older messages when user scrolls to top
  const handleLoadOlderMessages = useCallback(() => {
    if (activeConversation && hasMoreMessages && !isLoadingOlderMessages) {
      loadOlderMessages(activeConversation);
    }
  }, [
    activeConversation,
    hasMoreMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
  ]);

  // Use intersection observer to trigger loading more messages
  useIntersectionObserverCallback({
    target: loadMoreTriggerRef,
    onIntersect: handleLoadOlderMessages,
    enabled: hasMoreMessages && !isLoadingOlderMessages,
  });

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (shouldAutoScrollRef.current) {
        scrollToBottom(false);
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [scrollToBottom]);

  // Auto-scroll logic
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = previousMessageCountRef.current;

    // If this is the first load (messages went from 0 to some number)
    if (previousMessageCount === 0 && currentMessageCount > 0) {
      // Scroll to bottom instantly on initial load - use multiple timeouts to ensure it works
      setTimeout(() => scrollToBottomInstant(), 0);
      shouldAutoScrollRef.current = true;
    }
    // If new messages were added (not older messages loaded)
    else if (currentMessageCount > previousMessageCount) {
      const container = messagesContainerRef.current;
      if (container && shouldAutoScrollRef.current) {
        // Check if user is near the bottom before auto-scrolling
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (isNearBottom) {
          setTimeout(() => scrollToBottom(true), 0);
        }
      }
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages.length, scrollToBottom, scrollToBottomInstant]);

  // Monitor scroll position to determine auto-scroll behavior
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldAutoScrollRef.current = isNearBottom;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset auto-scroll when switching conversations
  useEffect(() => {
    shouldAutoScrollRef.current = true;
    previousMessageCountRef.current = 0;
  }, [activeConversation]);

  // Find the active conversation details
  const activeConversationData =
    conversations.find((conv) => conv._id === activeConversation) ||
    (fallbackParticipant && {
      participant: fallbackParticipant,
      isGroup: false,
    });

  const typingUsersArray = getTypingUsersForConversation();
  const isTyping = typingUsersArray.length > 0;

  // Helper function to format typing message
  const getTypingMessage = () => {
    if (typingUsersArray.length === 0) return "";

    if (typingUsersArray.length === 1) {
      const user = typingUsersArray[0];
      const displayName = user.firstName || user.userName || "Someone";
      return `${displayName} is typing...`;
    } else if (typingUsersArray.length === 2) {
      const user1 = typingUsersArray[0];
      const user2 = typingUsersArray[1];
      const name1 = user1.firstName || user1.userName || "Someone";
      const name2 = user2.firstName || user2.userName || "Someone";
      return `${name1} and ${name2} are typing...`;
    } else {
      return `${typingUsersArray.length} people are typing...`;
    }
  };

  const renderDefaultView = () => (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <div className="text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-24 w-24 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Welcome to Chat App
        </h3>
        <p className="text-sm text-gray-500">
          Select a conversation or start a new message
        </p>
      </div>
    </div>
  );

  const renderNewMessageView = () => (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <div className="text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-24 w-24 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">New Message</h3>
        <p className="text-sm text-gray-500">
          Search for someone to start a conversation
        </p>
      </div>
    </div>
  );

  const renderMessages = () => {
    if (isMessagesLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader size={24} color="blue" />
          <span className="ml-2 text-gray-500">Loading messages...</span>
        </div>
      );
    }

    const currentUser = userStore.getState().user;

    const filteredMessagesForEmptyCheck = messages.filter((message) => {
      // Always show current user's own messages
      if (message.sender._id === currentUser?.id) {
        return true;
      }

      // For other users' messages, check blocking status
      const senderId = message.sender._id;
      const isBlocked =
        isUserBlockedByMe(senderId) || amIBlockedByUser(senderId);

      return !isBlocked;
    });

    if (filteredMessagesForEmptyCheck.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Start the conversation with a message
            </p>
          </div>
        </div>
      );
    }

    // Helper function to determine which users last read each message
    const getUsersWhoLastReadEachMessage = (messagesToUse: typeof messages) => {
      if (!activeConversationData || !("_id" in activeConversationData))
        return new Map();

      const currentUser = userStore.getState().user;
      const messageToUsersMap = new Map<number, string[]>(); // messageIndex -> array of userIds

      // Get all participants except current user
      const participants = activeConversationData.isGroup
        ? activeConversationData.participants?.filter(
            (p) => p._id !== currentUser?.id
          ) || []
        : activeConversationData.participant
          ? [activeConversationData.participant]
          : [];

      participants.forEach((participant) => {
        const userReadAt = activeConversationData.readAt?.[participant._id];
        if (userReadAt) {
          const readAtTime = new Date(userReadAt).getTime();

          // Find the last message that was sent by current user before the read timestamp
          let lastReadIndex = -1;
          for (let i = messagesToUse.length - 1; i >= 0; i--) {
            const message = messagesToUse[i];
            const messageTime = new Date(message.createdAt).getTime();

            // Only consider messages sent by current user
            if (
              message.sender._id === currentUser?.id &&
              messageTime <= readAtTime
            ) {
              lastReadIndex = i;
              break;
            }
          }

          if (lastReadIndex !== -1) {
            // Add this participant to the users who last read this message
            const existingUsers = messageToUsersMap.get(lastReadIndex) || [];
            messageToUsersMap.set(lastReadIndex, [
              ...existingUsers,
              participant._id,
            ]);
          }
        }
      });

      return messageToUsersMap;
    };

    const renderedElements: React.ReactElement[] = [];

    // Add load more trigger at the top if there are more messages
    if (hasMoreMessages) {
      renderedElements.push(
        <div
          key="load-more-trigger"
          ref={loadMoreTriggerRef}
          className="flex justify-center py-4"
        >
          {isLoadingOlderMessages ? (
            <div className="flex items-center space-x-2">
              <Loader size={16} color="gray" />
              <span className="text-gray-500 text-sm">
                Loading older messages...
              </span>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">
              Scroll up to load older messages
            </div>
          )}
        </div>
      );
    }

    // Filter messages based on blocking relationships (reuse from above)
    const filteredMessages = filteredMessagesForEmptyCheck;

    const usersWhoLastReadEachMessage =
      getUsersWhoLastReadEachMessage(filteredMessages);

    filteredMessages.forEach((message, index) => {
      const isLast = index === filteredMessages.length - 1;
      const previousMessage = index > 0 ? filteredMessages[index - 1] : null;
      const nextMessage =
        index < filteredMessages.length - 1
          ? filteredMessages[index + 1]
          : null;
      const currentUser = userStore.getState().user;
      const isOwnMessage = currentUser?.id === message.sender._id;

      // Check if we should show a timestamp separator
      const showSeparator = shouldShowTimeSeparator(
        message.createdAt,
        previousMessage?.createdAt || null
      );

      // Add timestamp separator if needed
      if (showSeparator) {
        renderedElements.push(
          <TimestampSeparator
            key={`separator-${message._id}`}
            timestamp={message.createdAt}
          />
        );
      }

      // Check if there will be a timestamp separator after this message
      const nextMessageShowsSeparator = nextMessage
        ? shouldShowTimeSeparator(nextMessage.createdAt, message.createdAt)
        : false;

      const nextMessageIsGroupEvent = nextMessage?.messageType === "groupEvent";

      // Determine if we should show avatar for this message
      // Only show avatar for other users' messages (not own messages)
      // Show avatar only if:
      // 1. This is not the current user's message
      // 2. This is the last message in a sequence from the same sender, which happens when:
      //    - This is the last message overall OR
      //    - Next message is from a different sender OR
      //    - There will be a timestamp separator after this message (breaking the sequence)
      const showAvatar =
        !isOwnMessage &&
        (isLast || // Last message overall
          (nextMessage && nextMessage.sender._id !== message.sender._id) || // Next message from different sender
          nextMessageShowsSeparator ||
          nextMessageIsGroupEvent); // Timestamp separator will break the sequence

      // Get the users who last read this specific message
      const usersWhoLastReadThisMessage =
        usersWhoLastReadEachMessage.get(index) || [];

      // Add the message bubble
      renderedElements.push(
        <MessageBubble
          key={message._id}
          message={message}
          isLast={isLast}
          conversation={
            activeConversationData && "_id" in activeConversationData
              ? activeConversationData
              : undefined
          }
          usersWhoLastReadThisMessage={usersWhoLastReadThisMessage}
          showAvatar={showAvatar}
        />
      );
    });

    return renderedElements;
  };

  // Show default view if no active conversation and not in new message mode
  if (!activeConversation && !isNewMessage && !isMessagesLoading) {
    return <Container size="lg">{renderDefaultView()}</Container>;
  }

  // Show new message view if in new message mode but no recipients selected
  if (isNewMessage && newMessageRecipients.length === 0) {
    return (
      <Container size="lg">
        <ConversationHeader />
        {renderNewMessageView()}
      </Container>
    );
  }

  // Show conversation view
  return (
    <Container size="lg">
      <ConversationHeader
        participant={
          isNewMessage ? undefined : activeConversationData?.participant
        }
        conversation={
          isNewMessage ? undefined : activeConversationData || undefined
        }
        isTyping={isTyping}
      />

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 pb-20"
      >
        <div ref={conversationRef}>
          {renderMessages()}
          {isTyping && (
            <div className="flex justify-start mb-2">
              <div className="flex flex-col items-start">
                <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-2xl rounded-bl-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 ml-2">
                  {getTypingMessage()}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <MessageSender />
    </Container>
  );
}
