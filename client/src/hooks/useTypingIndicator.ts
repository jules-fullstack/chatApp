import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../store/chatStore";
import { useConversationStore } from "../store/conversationStore";

export function useTypingIndicator() {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { startTyping, stopTyping } = useChatStore();
  const { activeConversation, isNewMessage, newMessageRecipients } = useConversationStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTypingChange = (messageValue: string) => {
    if (isNewMessage && newMessageRecipients.length === 0) return;
    if (!isNewMessage && !activeConversation) return;

    // Handle typing for different conversation types
    const handleTyping = (isTypingNow: boolean) => {
      if (isNewMessage) {
        // For new messages, send typing to all recipients individually
        newMessageRecipients.forEach((recipient) => {
          if (isTypingNow) {
            startTyping(recipient._id);
          } else {
            stopTyping(recipient._id);
          }
        });
      } else if (activeConversation) {
        if (isTypingNow) {
          startTyping(activeConversation);
        } else {
          stopTyping(activeConversation);
        }
      }
    };

    if (messageValue && messageValue.trim().length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        handleTyping(true);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        handleTyping(false);
      }, 1000);
    } else if (isTyping) {
      setIsTyping(false);
      handleTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const stopTypingIndicator = () => {
    if (isTyping) {
      setIsTyping(false);
      if (isNewMessage) {
        newMessageRecipients.forEach((recipient) => {
          stopTyping(recipient._id);
        });
      } else if (activeConversation) {
        stopTyping(activeConversation);
      }
    }
  };

  return {
    isTyping,
    handleTypingChange,
    stopTypingIndicator,
  };
}