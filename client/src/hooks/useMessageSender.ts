import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useConversationStore } from "../store/conversationStore";
import { useMessageValidation } from "./useMessageValidation";

export function useMessageSender() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const [pendingImageUrls, setPendingAttachmentIds] = useState<string[]>([]);
  const [pendingMessageType, setPendingMessageType] = useState<string>("text");

  const {
    activeConversation,
    sendMessage,
    isNewMessage,
    newMessageRecipients,
    conversations,
  } = useConversationStore();

  const { validateMessage } = useMessageValidation();

  // Focused utility: Find existing 1:1 conversation with a recipient
  const findExistingConversation = (recipientId: string) => {
    return conversations.find(
      (conv) =>
        !conv.isGroup &&
        ((conv.participant && conv.participant._id === recipientId) ||
          (conv.participants &&
            conv.participants.length === 2 &&
            conv.participants.some((p) => p._id === recipientId)))
    );
  };

  // Focused utility: Handle multiple recipients for individual messaging
  const handleMultipleRecipientsForIndividualMessage = (
    messageContent: string,
    imageUrls: string[],
    messageType: string
  ) => {
    setPendingMessage(messageContent);
    setPendingAttachmentIds(imageUrls);
    setPendingMessageType(messageType);
    setShowGroupModal(true);
    setIsSubmitting(false);
  };

  // Focused utility: Send messages in sequence (text first, then images)
  const sendMessagesInSequence = async (
    recipients: string[],
    content: string,
    imageUrls: string[],
    hasText: boolean,
    hasImages: boolean,
    groupName?: string
  ) => {
    if (hasText && hasImages) {
      // Send text message first
      await sendMessage(recipients, content, groupName, "text", []);
      // Send image message second (no group name for second message)
      await sendMessage(recipients, "", undefined, "image", imageUrls);
    } else {
      // Send single message (either text or image)
      const messageType = hasImages ? "image" : "text";
      await sendMessage(recipients, content, groupName, messageType, imageUrls);
    }
  };

  // Focused utility: Handle existing conversation with state restoration
  const sendToExistingConversationWithStateRestore = async (
    existingConversation: { _id: string },
    messageContent: string,
    imageUrls: string[],
    hasText: boolean,
    hasImages: boolean
  ) => {
    const originalIsNewMessage = isNewMessage;
    const originalActiveConversation = activeConversation;
    
    // Temporarily modify state to treat as existing conversation
    useConversationStore.setState({ 
      isNewMessage: false, 
      activeConversation: existingConversation._id 
    });
    
    try {
      await sendMessagesInSequence(
        [existingConversation._id],
        messageContent,
        imageUrls,
        hasText,
        hasImages
      );
    } finally {
      // Restore original state
      useConversationStore.setState({ 
        isNewMessage: originalIsNewMessage, 
        activeConversation: originalActiveConversation 
      });
    }
  };

  const sendRegularMessage = async (
    messageContent: string,
    imageUrls: string[],
    hasText: boolean,
    hasImages: boolean,
    reset: () => void,
    clearImages: () => void,
    stopTypingIndicator: () => void
  ) => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    // Allow sending if there's either text or images
    if (!hasText && !hasImages) {
      notifications.show({
        title: "Empty Message",
        message: "Please enter a message or select images to send.",
        color: "orange",
        autoClose: 3000,
      });
      setIsSubmitting(false);
      return;
    }

    // Validate text if present
    if (hasText && !validateMessage(messageContent)) {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isNewMessage) {
        if (newMessageRecipients.length === 0) return;

        // If multiple recipients, show group modal first
        if (newMessageRecipients.length > 1) {
          const messageType = hasImages ? "image" : "text";
          handleMultipleRecipientsForIndividualMessage(messageContent, imageUrls, messageType);
          return;
        }

        // Single recipient - check if existing conversation exists
        const recipientId = newMessageRecipients[0]._id;
        const existingConversation = findExistingConversation(recipientId);

        if (existingConversation) {
          await sendToExistingConversationWithStateRestore(
            existingConversation,
            messageContent,
            imageUrls,
            hasText,
            hasImages
          );
        } else {
          // No existing conversation - create new message
          await sendMessagesInSequence([recipientId], messageContent, imageUrls, hasText, hasImages);
        }
      } else if (activeConversation) {
        // For existing conversations
        await sendMessagesInSequence([activeConversation], messageContent, imageUrls, hasText, hasImages);
      } else {
        return;
      }

      reset();
      clearImages();
      stopTypingIndicator();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendLikeMessage = async (stopTypingIndicator: () => void) => {
    // Prevent submission while already submitting
    if (isSubmitting) {
      return;
    }

    const thumbsUpMessage = "👍";

    if (!validateMessage(thumbsUpMessage)) {
      console.error("Thumbs up message failed validation");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isNewMessage) {
        if (newMessageRecipients.length === 0) return;

        // If multiple recipients, show group modal first
        if (newMessageRecipients.length > 1) {
          handleMultipleRecipientsForIndividualMessage(thumbsUpMessage, [], "text");
          return;
        }

        // Single recipient - check if existing conversation exists
        const recipientId = newMessageRecipients[0]._id;
        const existingConversation = findExistingConversation(recipientId);

        if (existingConversation) {
          await sendToExistingConversationWithStateRestore(
            existingConversation,
            thumbsUpMessage,
            [],
            true,
            false
          );
        } else {
          // No existing conversation - create new message
          await sendMessage([recipientId], thumbsUpMessage);
        }
      } else if (activeConversation) {
        await sendMessage([activeConversation], thumbsUpMessage);
      }

      stopTypingIndicator();
    } catch (error) {
      console.error("Error sending like message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGroupNameConfirm = async (
    groupName: string,
    reset: () => void,
    clearImages: () => void,
    stopTypingIndicator: () => void
  ) => {
    if (
      (!pendingMessage && pendingImageUrls.length === 0) ||
      newMessageRecipients.length === 0
    ) {
      setIsSubmitting(false); // Reset state if validation fails
      return;
    }

    if (pendingMessage && !validateMessage(pendingMessage)) {
      console.error("Pending message failed validation");
      setIsSubmitting(false); // Reset state if validation fails
      return;
    }

    // Prevent duplicate submissions during group message creation
    if (isSubmitting) {
      return;
    }

    // Only set submitting state if it's not already set
    if (!isSubmitting) {
      setIsSubmitting(true);
    }

    try {
      const recipientIds = newMessageRecipients.map((r) => r._id);
      const hasText = Boolean(pendingMessage && pendingMessage.trim().length > 0);
      const hasImages = Boolean(pendingImageUrls.length > 0);

      // Use shared utility for group message sending
      await sendMessagesInSequence(
        recipientIds,
        pendingMessage,
        pendingImageUrls,
        hasText,
        hasImages,
        groupName
      );

      reset();
      setPendingMessage("");
      setPendingAttachmentIds([]);
      setPendingMessageType("text");
      clearImages();
      stopTypingIndicator();
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

  // External state control methods for immediate UI feedback
  const setSubmittingState = (submitting: boolean) => {
    setIsSubmitting(submitting);
  };

  return {
    isSubmitting,
    showGroupModal,
    pendingMessage,
    pendingImageUrls,
    pendingMessageType,
    sendRegularMessage,
    sendLikeMessage,
    handleGroupNameConfirm,
    handleGroupModalClose,
    setShowGroupModal,
    setPendingMessage,
    setPendingAttachmentIds,
    setPendingMessageType,
    setSubmittingState,
  };
}