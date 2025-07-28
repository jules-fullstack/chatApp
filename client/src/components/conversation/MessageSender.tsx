import { PhotoIcon } from "@heroicons/react/24/outline";
import { HandThumbUpIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useForm } from "react-hook-form";
import { notifications } from "@mantine/notifications";
import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../../store/chatStore";
import { useConversationStore } from "../../store/conversationStore";
import {
  messageSchema,
  type MessageFormData,
} from "../../schemas/messageSchema";
import { API_BASE_URL } from "../../config";
import { FormField } from "../ui";
import { GroupNameModal } from "../modals";
import { ImagePreview } from "./";

export default function MessageSender() {
  const {
    activeConversation,
    sendMessage,
    isNewMessage,
    newMessageRecipients,
    markConversationAsRead,
    conversations,
  } = useConversationStore();
  const { startTyping, stopTyping, checkIfBlockedBy, blockingUpdateTrigger } =
    useChatStore();
  const [isTyping, setIsTyping] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const [pendingImageUrls, setPendingAttachmentIds] = useState<string[]>([]);
  const [pendingMessageType, setPendingMessageType] = useState<string>("text");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBlockedUser, setHasBlockedUser] = useState(false);
  const [isBlockedByUser, setIsBlockedByUser] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILES = 10;
  const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  const validateMessage = (message: string): boolean => {
    try {
      messageSchema.parse({ message });
      return true;
    } catch (error: unknown) {
      // Zod error structure: error.issues[0].message
      const errorMessage =
        (error as { issues?: { message: string }[] })?.issues?.[0]?.message ||
        "Invalid message";
      notifications.show({
        title: "Message Validation Error",
        message: errorMessage,
        color: "red",
        autoClose: 3000,
      });
      return false;
    }
  };

  const validateImages = (files: File[]): boolean => {
    const currentTotal = selectedImages.length;
    const newTotal = currentTotal + files.length;

    if (newTotal > MAX_FILES) {
      notifications.show({
        title: "Too Many Files",
        message: `Maximum ${MAX_FILES} images allowed. You can add ${MAX_FILES - currentTotal} more.`,
        color: "red",
        autoClose: 3000,
      });
      return false;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        notifications.show({
          title: "Invalid File Type",
          message: `Only JPEG, PNG, GIF, and WebP images are allowed.`,
          color: "red",
          autoClose: 3000,
        });
        return false;
      }
    }

    const currentSize = selectedImages.reduce(
      (total, img) => total + img.size,
      0
    );
    const newSize = files.reduce((total, file) => total + file.size, 0);
    const totalSize = currentSize + newSize;

    if (totalSize > MAX_TOTAL_SIZE) {
      notifications.show({
        title: "Files Too Large",
        message: `Total file size cannot exceed 5MB.`,
        color: "red",
        autoClose: 3000,
      });
      return false;
    }

    return true;
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && validateImages(files)) {
      setSelectedImages((prev) => [...prev, ...files]);
    }
    // Reset the input value so the same file can be selected again
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddImages = (files: File[]) => {
    if (validateImages(files)) {
      setSelectedImages((prev) => [...prev, ...files]);
    }
  };

  const uploadImages = async (images: File[]): Promise<string[]> => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append("images", image);
    });

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/media/upload-images`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to upload images");
    }

    const result = await response.json();
    return result.images;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<MessageFormData>();

  const messageValue = watch("message");

  // Check blocking status when conversation changes (only for direct messages)
  useEffect(() => {
    const checkBlockingStatus = async () => {
      if (!activeConversation) {
        setHasBlockedUser(false);
        setIsBlockedByUser(false);
        return;
      }

      try {
        let targetUserId: string | null = null;
        let isGroupChat = false;

        if (isNewMessage && newMessageRecipients.length > 0) {
          // New message scenario
          if (newMessageRecipients.length === 1) {
            // Direct message to one person
            targetUserId = newMessageRecipients[0]._id;
            isGroupChat = false;
          } else {
            // Group message
            isGroupChat = true;
          }
        } else if (activeConversation.startsWith("user:")) {
          // Direct message with user: format
          targetUserId = activeConversation.replace("user:", "");
          isGroupChat = false;
        } else {
          // Existing conversation - find it in conversations list
          const conversation = conversations.find(
            (c) => c._id === activeConversation
          );
          if (conversation) {
            isGroupChat = conversation.isGroup;
            if (!isGroupChat && conversation.participant) {
              targetUserId = conversation.participant._id;
            }
          }
        }

        // Only check blocking for direct messages, not group chats
        if (!isGroupChat && targetUserId) {
          const [blockedUsers, isBlockedByOtherUser] = await Promise.all([
            fetch(`${API_BASE_URL}/users/blocked`, {
              credentials: "include",
            })
              .then((res) => res.json())
              .then((data) => data.blockedUsers || []),
            checkIfBlockedBy(targetUserId),
          ]);

          const hasBlockedOtherUser = blockedUsers.some(
            (user: { id?: string; _id?: string }) =>
              (user.id || user._id) === targetUserId
          );

          setHasBlockedUser(hasBlockedOtherUser);
          setIsBlockedByUser(isBlockedByOtherUser);
        } else {
          // For group chats, reset blocking states (don't disable MessageSender)
          setHasBlockedUser(false);
          setIsBlockedByUser(false);
        }
      } catch (error) {
        console.error("Error checking blocking status:", error);
      }
    };

    checkBlockingStatus();
  }, [
    activeConversation,
    conversations,
    isNewMessage,
    newMessageRecipients,
    blockingUpdateTrigger,
    checkIfBlockedBy,
  ]);

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
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    // Allow sending if there's either text or images
    const hasText = data.message && data.message.trim().length > 0;
    const hasImages = selectedImages.length > 0;

    if (!hasText && !hasImages) {
      notifications.show({
        title: "Empty Message",
        message: "Please enter a message or select images to send.",
        color: "orange",
        autoClose: 3000,
      });
      return;
    }

    // Validate text if present
    if (hasText && !validateMessage(data.message)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first if any
      let imageUrls: string[] = [];
      if (hasImages) {
        try {
          imageUrls = await uploadImages(selectedImages);
        } catch {
          notifications.show({
            title: "Upload Failed",
            message: "Failed to upload images. Please try again.",
            color: "red",
            autoClose: 3000,
          });
          return;
        }
      }

      const messageContent = hasText ? data.message.trim() : "";

      if (isNewMessage) {
        if (newMessageRecipients.length === 0) return;

        // If multiple recipients, show group modal first
        if (newMessageRecipients.length > 1) {
          setPendingMessage(messageContent);
          setPendingAttachmentIds(imageUrls);
          setPendingMessageType(hasImages ? "image" : "text");
          setShowGroupModal(true);
          setIsSubmitting(false); // Reset submitting state when showing modal
          return;
        }

        // Single recipient - check if existing conversation exists
        const recipientId = newMessageRecipients[0]._id;
        const existingConversation = conversations.find(
          (conv) =>
            !conv.isGroup &&
            ((conv.participant && conv.participant._id === recipientId) ||
              // fallback for some data shapes
              (conv.participants &&
                conv.participants.length === 2 &&
                conv.participants.some((p) => p._id === recipientId)))
        );

        if (existingConversation) {
          // Existing conversation found - temporarily set as active and send
          const originalIsNewMessage = isNewMessage;
          const originalActiveConversation = activeConversation;
          
          // Temporarily modify state to treat as existing conversation
          useConversationStore.setState({ 
            isNewMessage: false, 
            activeConversation: existingConversation._id 
          });
          
          try {
            if (hasText && hasImages) {
              // Send text message first
              await sendMessage(
                [existingConversation._id],
                messageContent,
                undefined,
                "text",
                []
              );
              // Send image message second
              await sendMessage(
                [existingConversation._id],
                "",
                undefined,
                "image",
                imageUrls
              );
            } else {
              // Send single message (either text or image)
              const messageType = hasImages ? "image" : "text";
              await sendMessage(
                [existingConversation._id],
                messageContent,
                undefined,
                messageType,
                imageUrls
              );
            }
          } finally {
            // Restore original state
            useConversationStore.setState({ 
              isNewMessage: originalIsNewMessage, 
              activeConversation: originalActiveConversation 
            });
          }
        } else {
          // No existing conversation - create new message
          const recipientIds = [recipientId]; // Ensure we're only passing the ID

          if (hasText && hasImages) {
            // Send text message first
            await sendMessage(
              recipientIds,
              messageContent,
              undefined,
              "text",
              []
            );
            // Send image message second
            await sendMessage(recipientIds, "", undefined, "image", imageUrls);
          } else {
            // Send single message (either text or image)
            const messageType = hasImages ? "image" : "text";
            await sendMessage(
              recipientIds,
              messageContent,
              undefined,
              messageType,
              imageUrls
            );
          }
        }
      } else if (activeConversation) {
        // For existing conversations,
        // Send to the conversation endpoint with conversationId
        if (hasText && hasImages) {
          // Send text message first
          await sendMessage(
            [activeConversation],
            messageContent,
            undefined,
            "text",
            []
          );
          // Send image message second
          await sendMessage(
            [activeConversation],
            "",
            undefined,
            "image",
            imageUrls
          );
        } else {
          // Send single message (either text or image)
          const messageType = hasImages ? "image" : "text";
          await sendMessage(
            [activeConversation],
            messageContent,
            undefined,
            messageType,
            imageUrls
          );
        }
      } else {
        return;
      }

      reset({ message: "" });
      setSelectedImages([]);

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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  const handleLikeClick = () => {
    // Prevent submission while already submitting
    if (isSubmitting) {
      return;
    }

    const thumbsUpMessage = "👍";

    if (!validateMessage(thumbsUpMessage)) {
      console.error("Thumbs up message failed validation");
      return;
    }

    setIsSubmitting(true);

    if (isNewMessage) {
      if (newMessageRecipients.length === 0) return;

      // If multiple recipients, show group modal first
      if (newMessageRecipients.length > 1) {
        setPendingMessage(thumbsUpMessage);
        setPendingAttachmentIds([]);
        setPendingMessageType("text");
        setShowGroupModal(true);
        setIsSubmitting(false); // Reset submitting state when showing modal
        return;
      }

      // Single recipient - check if existing conversation exists
      const recipientId = newMessageRecipients[0]._id;
      const existingConversation = conversations.find(
        (conv) =>
          !conv.isGroup &&
          ((conv.participant && conv.participant._id === recipientId) ||
            // fallback for some data shapes
            (conv.participants &&
              conv.participants.length === 2 &&
              conv.participants.some((p) => p._id === recipientId)))
      );

      if (existingConversation) {
        // Existing conversation found - temporarily set as active and send
        const originalIsNewMessage = isNewMessage;
        const originalActiveConversation = activeConversation;
        
        // Temporarily modify state to treat as existing conversation
        useConversationStore.setState({ 
          isNewMessage: false, 
          activeConversation: existingConversation._id 
        });
        
        sendMessage([existingConversation._id], thumbsUpMessage)
          .finally(() => {
            // Restore original state
            useConversationStore.setState({ 
              isNewMessage: originalIsNewMessage, 
              activeConversation: originalActiveConversation 
            });
            setIsSubmitting(false);
          });
      } else {
        // No existing conversation - create new message
        const recipientIds = [recipientId]; // Ensure we're only passing the ID
        sendMessage(recipientIds, thumbsUpMessage).finally(() =>
          setIsSubmitting(false)
        );
      }
    } else if (activeConversation) {
      sendMessage([activeConversation], thumbsUpMessage).finally(() =>
        setIsSubmitting(false)
      );
    } else {
      setIsSubmitting(false);
    }
  };

  const handleGroupNameConfirm = async (groupName: string) => {
    if (
      (!pendingMessage && pendingImageUrls.length === 0) ||
      newMessageRecipients.length === 0
    )
      return;

    if (pendingMessage && !validateMessage(pendingMessage)) {
      console.error("Pending message failed validation");
      return;
    }

    // Prevent duplicate submissions during group message creation
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const recipientIds = newMessageRecipients.map((r) => r._id);
      const hasText = pendingMessage && pendingMessage.trim().length > 0;
      const hasImages = pendingImageUrls.length > 0;

      if (hasText && hasImages) {
        // Send text message first
        await sendMessage(recipientIds, pendingMessage, groupName, "text", []);
        // Send image message second
        await sendMessage(
          recipientIds,
          "",
          undefined, // Don't set group name again for second message
          "image",
          pendingImageUrls
        );
      } else {
        // Send single message (either text or image)
        await sendMessage(
          recipientIds,
          pendingMessage,
          groupName,
          pendingMessageType,
          pendingImageUrls
        );
      }

      reset();
      setPendingMessage("");
      setPendingAttachmentIds([]);
      setPendingMessageType("text");
      setSelectedImages([]);

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        newMessageRecipients.forEach((recipient) => {
          stopTyping(recipient._id);
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGroupModalClose = () => {
    setShowGroupModal(false);
    setPendingMessage("");
    setPendingAttachmentIds([]);
    setPendingMessageType("text");
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
        {hasBlockedUser && (
          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-800 text-sm font-medium">
              You blocked this person
            </p>
            <p className="text-orange-600 text-xs mt-1">
              You won't receive messages from them and they can't see when
              you're active.
            </p>
          </div>
        )}

        {isBlockedByUser && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm font-medium">
              You can no longer reply to this conversation
            </p>
            <p className="text-red-600 text-xs mt-1">
              This person has restricted their messages. You won't be able to
              message them.
            </p>
          </div>
        )}

        <ImagePreview
          images={selectedImages}
          onRemoveImage={handleRemoveImage}
          onAddImages={handleAddImages}
          maxFiles={MAX_FILES}
          maxTotalSize={MAX_TOTAL_SIZE}
        />

        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center">
          <PhotoIcon
            className={`size-6 mr-4 transition-colors ${
              hasBlockedUser || isBlockedByUser
                ? "cursor-not-allowed text-gray-400"
                : "cursor-pointer text-gray-500 hover:text-gray-700"
            }`}
            onClick={
              hasBlockedUser || isBlockedByUser ? undefined : handlePhotoClick
            }
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={hasBlockedUser || isBlockedByUser}
          />

          <div className="flex-1 mr-4">
            <FormField
              name="message"
              type="text"
              placeholder={
                hasBlockedUser || isBlockedByUser
                  ? "You can no longer reply to this conversation"
                  : "Aa"
              }
              register={register}
              errors={errors}
              containerClassName="bg-gray-200 rounded-2xl"
              inputClassName="w-full disabled:cursor-not-allowed focus:outline-none p-2 bg-transparent resize-none"
              showError={false}
              onKeyDown={handleKeyDown}
              disabled={hasBlockedUser || isBlockedByUser}
            />
          </div>

          {(messageValue && messageValue.trim()) ||
          selectedImages.length > 0 ? (
            <button
              type="submit"
              disabled={isSubmitting || hasBlockedUser || isBlockedByUser}
              className={`p-2 transition-colors ${
                isSubmitting || hasBlockedUser || isBlockedByUser
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-500 hover:text-blue-700"
              }`}
            >
              <PaperAirplaneIcon className="size-6 cursor-pointer" />
            </button>
          ) : (
            <button
              type="button"
              onClick={
                hasBlockedUser || isBlockedByUser ? undefined : handleLikeClick
              }
              disabled={isSubmitting || hasBlockedUser || isBlockedByUser}
              className={`p-2 transition-colors ${
                isSubmitting || hasBlockedUser || isBlockedByUser
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-500 hover:text-blue-700"
              }`}
            >
              <HandThumbUpIcon className="size-6 cursor-pointer" />
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
