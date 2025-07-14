import { useEffect, useRef } from "react";
import ConversationHeader from "./ConversationHeader";
import MessageSender from "./MessageSender";
import MessageBubble from "./MessageBubble";
import Container from "./ui/Container";
import { useChatStore } from "../store/chatStore";

export default function MessageWindow() {
  const {
    activeConversation,
    messages,
    conversations,
    typingUsers,
    fallbackParticipant,
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Find the active conversation details
  const activeConversationData =
    conversations.find((conv) => conv.participant._id === activeConversation) ||
    (fallbackParticipant && {
      participant: fallbackParticipant,
    });

  const isTyping = typingUsers.has(activeConversation || "");

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
          Search for a user to start a conversation
        </p>
      </div>
    </div>
  );

  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <span className="text-gray-500 text-sm">No messages yet</span>
        </div>
      );
    }

    return messages.map((message, index) => {
      const isLast = index === messages.length - 1;
      const showTime =
        index === 0 ||
        (index > 0 &&
          new Date(message.createdAt).getTime() -
            new Date(messages[index - 1].createdAt).getTime() >
            5 * 60 * 1000);

      return (
        <MessageBubble
          key={message._id}
          message={message}
          isLast={isLast}
          showTime={showTime}
        />
      );
    });
  };

  if (!activeConversation) {
    return <Container size="lg">{renderDefaultView()}</Container>;
  }

  return (
    <Container size="lg">
      <ConversationHeader
        participant={activeConversationData?.participant}
        isTyping={isTyping}
      />

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {renderMessages()}
        {isTyping && (
          <div className="flex justify-start mb-2">
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
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageSender />
    </Container>
  );
}
