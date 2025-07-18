import { PhotoIcon } from "@heroicons/react/24/outline";
import { HandThumbUpIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useForm } from "react-hook-form";
import { notifications } from "@mantine/notifications";
import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../store/chatStore";
import { messageSchema, type MessageFormData } from "../schemas/messageSchema";
import FormField from "./ui/FormField";
import GroupNameModal from "./GroupNameModal";

export default function MessageSender() {
  const {
    activeConversation,
    sendMessage,
    startTyping,
    stopTyping,
    isNewMessage,
    newMessageRecipients,
    markConversationAsRead,
  } = useChatStore();
  const [isTyping, setIsTyping] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateMessage = (message: string): boolean => {
    try {
      messageSchema.parse({ message });
      return true;
    } catch (error: any) {
      // Zod error structure: error.issues[0].message
      const errorMessage = error.issues?.[0]?.message || 'Invalid message';
      notifications.show({
        title: 'Message Validation Error',
        message: errorMessage,
        color: 'red',
        autoClose: 3000,
      });
      return false;
    }
  };

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
    // Manually validate and show notification if invalid
    if (!validateMessage(data.message)) {
      return;
    }

    try {
      if (isNewMessage) {
        if (newMessageRecipients.length === 0) return;

        // If multiple recipients, show group modal first
        if (newMessageRecipients.length > 1) {
          setPendingMessage(data.message.trim());
          setShowGroupModal(true);
          return;
        }

        // Single recipient - send directly
        const recipientIds = newMessageRecipients.map((r) => r._id);
        await sendMessage(recipientIds, data.message.trim());
      } else if (activeConversation) {
        // For existing conversations,
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
          newMessageRecipients.forEach((recipient) => {
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
    const thumbsUpMessage = "👍";

    if (!validateMessage(thumbsUpMessage)) {
      console.error("Thumbs up message failed validation");
      return;
    }

    if (isNewMessage) {
      if (newMessageRecipients.length === 0) return;

      // If multiple recipients, show group modal first
      if (newMessageRecipients.length > 1) {
        setPendingMessage(thumbsUpMessage);
        setShowGroupModal(true);
        return;
      }

      // Single recipient - send directly
      const recipientIds = newMessageRecipients.map((r) => r._id);
      sendMessage(recipientIds, thumbsUpMessage);
    } else if (activeConversation) {
      sendMessage([activeConversation], thumbsUpMessage);
    }
  };

  const handleGroupNameConfirm = async (groupName: string) => {
    if (!pendingMessage || newMessageRecipients.length === 0) return;

    if (!validateMessage(pendingMessage)) {
      console.error("Pending message failed validation");
      return;
    }

    try {
      const recipientIds = newMessageRecipients.map((r) => r._id);
      await sendMessage(recipientIds, pendingMessage, groupName);

      reset();
      setPendingMessage("");

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        newMessageRecipients.forEach((recipient) => {
          stopTyping(recipient._id);
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleGroupModalClose = () => {
    setShowGroupModal(false);
    setPendingMessage("");
  };

  const handleMessageSenderClick = () => {
    // Mark conversation as read when user clicks on MessageSender
    if (activeConversation && !activeConversation.startsWith("user:")) {
      markConversationAsRead(activeConversation);
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
    <>
      <div
        className="absolute bottom-0 left-0 right-0 bg-white p-4"
        onClick={handleMessageSenderClick}
      >
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

      <GroupNameModal
        opened={showGroupModal}
        onClose={handleGroupModalClose}
        onConfirm={handleGroupNameConfirm}
        participantNames={newMessageRecipients.map(
          (r) => r.firstName + " " + r.lastName
        )}
      />
    </>
  );
}
