import { PhotoIcon } from "@heroicons/react/24/outline";
import { HandThumbUpIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useForm } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../store/chatStore";
import { type MessageFormData } from "../types";
import FormField from "./ui/FormField";

export default function MessageSender() {
  const {
    activeConversation,
    sendMessage,
    startTyping,
    stopTyping,
    isNewMessage,
    newMessageRecipients,
  } = useChatStore();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<MessageFormData>();

  const messageValue = watch("message");

  // Handle typing indicators
  useEffect(() => {
    if (isNewMessage && newMessageRecipients.length === 0) return;
    if (!isNewMessage && !activeConversation) return;

    // Handle typing for different conversation types
    const handleTyping = (isTypingNow: boolean) => {
      console.log('DEBUG: MessageSender handleTyping called - isTypingNow:', isTypingNow, 'isNewMessage:', isNewMessage, 'activeConversation:', activeConversation, 'newMessageRecipients:', newMessageRecipients);
      
      if (isNewMessage) {
        // For new messages, send typing to all recipients individually
        newMessageRecipients.forEach(recipient => {
          console.log('DEBUG: New message typing to recipient:', recipient._id);
          if (isTypingNow) {
            startTyping(recipient._id);
          } else {
            stopTyping(recipient._id);
          }
        });
      } else if (activeConversation) {
        // For existing conversations (both direct and group), send to the conversation
        console.log('DEBUG: Existing conversation typing to:', activeConversation);
        if (isTypingNow) {
          startTyping(activeConversation);
        } else {
          stopTyping(activeConversation);
        }
      } else {
        console.log('DEBUG: No active conversation or new message recipients');
      }
    };

    console.log('DEBUG: MessageSender useEffect - messageValue:', messageValue, 'messageValue.length:', messageValue?.length, 'isTyping:', isTyping);
    
    if (messageValue && messageValue.trim().length > 0) {
      console.log('DEBUG: User is typing, messageValue has content');
      if (!isTyping) {
        console.log('DEBUG: Starting typing indicator');
        setIsTyping(true);
        handleTyping(true);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        console.log('DEBUG: Typing timeout - stopping typing indicator');
        setIsTyping(false);
        handleTyping(false);
      }, 1000);
    } else if (isTyping) {
      console.log('DEBUG: Stopping typing indicator - no message content');
      setIsTyping(false);
      handleTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [
    messageValue,
    activeConversation,
    isNewMessage,
    newMessageRecipients,
    isTyping,
    startTyping,
    stopTyping,
  ]);

  const onSubmit = async (data: MessageFormData) => {
    if (!data.message.trim()) return;

    try {
      if (isNewMessage) {
        if (newMessageRecipients.length === 0) return;
        const recipientIds = newMessageRecipients.map(r => r._id);
        await sendMessage(recipientIds, data.message.trim());
      } else if (activeConversation) {
        // For existing conversations, we need to use a different approach
        // Send to the conversation endpoint with conversationId
        await sendMessage([activeConversation], data.message.trim());
      } else {
        return;
      }
      
      reset();

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        if (isNewMessage) {
          newMessageRecipients.forEach(recipient => {
            stopTyping(recipient._id);
          });
        } else if (activeConversation) {
          stopTyping(activeConversation);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  const handleLikeClick = () => {
    if (isNewMessage) {
      if (newMessageRecipients.length === 0) return;
      const recipientIds = newMessageRecipients.map(r => r._id);
      sendMessage(recipientIds, "👍");
    } else if (activeConversation) {
      sendMessage([activeConversation], "👍");
    }
  };

  // Don't show MessageSender if in new message mode but no recipients selected
  if (isNewMessage && newMessageRecipients.length === 0) {
    return null;
  }

  // Don't show MessageSender if no active conversation and not in new message mode
  if (!activeConversation && !isNewMessage) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-center">
        <PhotoIcon className="size-6 mr-4 cursor-pointer text-gray-500 hover:text-gray-700 transition-colors" />

        <div className="flex-1 mr-4">
          <FormField
            name="message"
            type="text"
            placeholder="Aa"
            register={register}
            errors={errors}
            containerClassName="bg-gray-200 rounded-2xl"
            inputClassName="w-full focus:outline-none p-2 bg-transparent resize-none"
            showError={false}
            onKeyDown={handleKeyDown}
          />
        </div>

        {messageValue && messageValue.trim() ? (
          <button
            type="submit"
            className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
          >
            <PaperAirplaneIcon className="size-6" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLikeClick}
            className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
          >
            <HandThumbUpIcon className="size-6" />
          </button>
        )}
      </form>
    </div>
  );
}
