import { useEffect, useRef } from "react";
import ConversationHeader from "./ConversationHeader";
import MessageSender from "./MessageSender";
import MessageBubble from "./MessageBubble";
import Container from "./ui/Container";
import { useChatStore } from "../store/chatStore";
import { userStore } from "../store/userStore";
import { useConversationRead } from "../hooks/useMessageRead";
import { Loader } from "@mantine/core";

export default function MessageWindow() {
  const {
    activeConversation,
    messages,
    conversations,
    fallbackParticipant,
    isNewMessage,
    newMessageRecipients,
    isMessagesLoading,
    getTypingUsersForConversation,
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use intersection observer to mark conversation as read when visible
  const { ref: conversationRef } = useConversationRead(
    activeConversation || '',
    !!activeConversation
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    if (messages.length === 0) {
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
    const getUsersWhoLastReadEachMessage = () => {
      if (!activeConversationData || !('_id' in activeConversationData)) return new Map();
      
      const currentUser = userStore.getState().user;
      const messageToUsersMap = new Map<number, string[]>(); // messageIndex -> array of userIds
      
      // Get all participants except current user
      const participants = activeConversationData.isGroup 
        ? activeConversationData.participants?.filter(p => p._id !== currentUser?.id) || []
        : activeConversationData.participant ? [activeConversationData.participant] : [];
      
      participants.forEach(participant => {
        const userReadAt = activeConversationData.readAt?.[participant._id];
        if (userReadAt) {
          const readAtTime = new Date(userReadAt).getTime();
          
          // Find the last message that was sent by current user before the read timestamp
          let lastReadIndex = -1;
          for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            const messageTime = new Date(message.createdAt).getTime();
            
            // Only consider messages sent by current user
            if (message.sender._id === currentUser?.id && messageTime <= readAtTime) {
              lastReadIndex = i;
              break;
            }
          }
          
          if (lastReadIndex !== -1) {
            // Add this participant to the users who last read this message
            const existingUsers = messageToUsersMap.get(lastReadIndex) || [];
            messageToUsersMap.set(lastReadIndex, [...existingUsers, participant._id]);
          }
        }
      });
      
      return messageToUsersMap;
    };
    
    const usersWhoLastReadEachMessage = getUsersWhoLastReadEachMessage();
    
    return messages.map((message, index) => {
      const isLast = index === messages.length - 1;
      const showTime =
        index === 0 ||
        (index > 0 &&
          new Date(message.createdAt).getTime() -
            new Date(messages[index - 1].createdAt).getTime() >
            5 * 60 * 1000);

      // Get the users who last read this specific message
      const usersWhoLastReadThisMessage = usersWhoLastReadEachMessage.get(index) || [];

      return (
        <MessageBubble
          key={message._id}
          message={message}
          isLast={isLast}
          showTime={showTime}
          conversation={activeConversationData && '_id' in activeConversationData ? activeConversationData : undefined}
          usersWhoLastReadThisMessage={usersWhoLastReadThisMessage}
        />
      );
    });
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
        conversation={isNewMessage ? undefined : (activeConversationData || undefined)}
        isTyping={isTyping}
      />

      <div ref={conversationRef} className="flex-1 overflow-y-auto p-4 pb-20">
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

      <MessageSender />
    </Container>
  );
}
