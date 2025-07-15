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
    newMessageRecipient,
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
    const recipientId = isNewMessage
      ? newMessageRecipient?._id
      : activeConversation;
    if (!recipientId) return;

    if (messageValue && messageValue.trim().length > 0) {
      if (!isTyping) {
        setIsTyping(true);
        startTyping(recipientId);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        stopTyping(recipientId);
      }, 1000);
    } else if (isTyping) {
      setIsTyping(false);
      stopTyping(recipientId);
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
    newMessageRecipient,
    isTyping,
    startTyping,
    stopTyping,
  ]);

  const onSubmit = async (data: MessageFormData) => {
    const recipientId = isNewMessage
      ? newMessageRecipient?._id
      : activeConversation;
    if (!recipientId || !data.message.trim()) return;

    try {
      await sendMessage(recipientId, data.message.trim());
      reset();

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        stopTyping(recipientId);
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
    const recipientId = isNewMessage
      ? newMessageRecipient?._id
      : activeConversation;
    if (!recipientId) return;
    sendMessage(recipientId, "👍");
  };

  // Don't show MessageSender if in new message mode but no recipient selected
  if (isNewMessage && !newMessageRecipient) {
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
