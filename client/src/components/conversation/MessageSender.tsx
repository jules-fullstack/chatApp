import React from "react";
import { useForm } from "react-hook-form";
import { type MessageFormData } from "../../schemas/messageSchema";
import { useConversationStore } from "../../store/conversationStore";
import { GroupNameModal } from "../modals";
import { ImagePreview } from "./";
import { BlockingNotification } from "./BlockingNotification";
import { MessageInputField } from "./MessageInputField";
import { MessageActions } from "./MessageActions";
import { useMessageValidation } from "../../hooks/useMessageValidation";
import { useImageUpload } from "../../hooks/useImageUpload";
import { useTypingIndicator } from "../../hooks/useTypingIndicator";
import { useBlockingStatus } from "../../hooks/useBlockingStatus";
import { useMessageSender } from "../../hooks/useMessageSender";

export default function MessageSender() {
  const {
    activeConversation,
    isNewMessage,
    newMessageRecipients,
    markConversationAsRead,
  } = useConversationStore();

  // Custom hooks
  const { MAX_FILES, MAX_TOTAL_SIZE } = useMessageValidation();
  const {
    selectedImages,
    fileInputRef,
    handlePhotoClick,
    handleFileChange,
    handleRemoveImage,
    handleAddImages,
    uploadImages,
    clearImages,
  } = useImageUpload();
  const { handleTypingChange, stopTypingIndicator } = useTypingIndicator();
  const { hasBlockedUser, isBlockedByUser } = useBlockingStatus();
  const {
    isSubmitting,
    showGroupModal,
    sendRegularMessage,
    sendLikeMessage,
    handleGroupNameConfirm,
    handleGroupModalClose,
  } = useMessageSender();

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<MessageFormData>();

  const messageValue = watch("message");

  // Handle typing changes
  React.useEffect(() => {
    handleTypingChange(messageValue);
  }, [messageValue, handleTypingChange]);

  const onSubmit = async (data: MessageFormData) => {
    // Allow sending if there's either text or images
    const hasText = Boolean(data.message && data.message.trim().length > 0);
    const hasImages = selectedImages.length > 0;
    const messageContent = hasText ? data.message.trim() : "";

    // Upload images first if any
    let imageUrls: string[] = [];
    if (hasImages) {
      try {
        imageUrls = await uploadImages(selectedImages);
      } catch {
        return; // uploadImages handles error notifications
      }
    }

    await sendRegularMessage(
      messageContent,
      imageUrls,
      hasText,
      hasImages,
      () => reset({ message: "" }),
      clearImages,
      stopTypingIndicator
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  const handleLikeClick = async () => {
    await sendLikeMessage(stopTypingIndicator);
  };

  const handleGroupConfirm = async (groupName: string) => {
    await handleGroupNameConfirm(
      groupName,
      () => reset({ message: "" }),
      clearImages,
      stopTypingIndicator
    );
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
        <BlockingNotification
          hasBlockedUser={hasBlockedUser}
          isBlockedByUser={isBlockedByUser}
        />

        <ImagePreview
          images={selectedImages}
          onRemoveImage={handleRemoveImage}
          onAddImages={handleAddImages}
          maxFiles={MAX_FILES}
          maxTotalSize={MAX_TOTAL_SIZE}
        />

        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center">
          <MessageInputField
            register={register}
            errors={errors}
            hasBlockedUser={hasBlockedUser}
            isBlockedByUser={isBlockedByUser}
            onKeyDown={handleKeyDown}
          />
          <MessageActions
            messageValue={messageValue || ""}
            selectedImages={selectedImages}
            isSubmitting={isSubmitting}
            hasBlockedUser={hasBlockedUser}
            isBlockedByUser={isBlockedByUser}
            fileInputRef={fileInputRef}
            onPhotoClick={handlePhotoClick}
            onFileChange={handleFileChange}
            onLikeClick={handleLikeClick}
          />
        </form>
      </div>

      <GroupNameModal
        opened={showGroupModal}
        onClose={handleGroupModalClose}
        onConfirm={handleGroupConfirm}
        participantNames={newMessageRecipients.map(
          (r) => r.firstName + " " + r.lastName
        )}
      />
    </>
  );
}
