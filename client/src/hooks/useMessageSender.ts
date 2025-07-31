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
      setIsSubmitting(false); // Reset state if validation fails
      return;
    }

    // Validate text if present
    if (hasText && !validateMessage(messageContent)) {
      setIsSubmitting(false); // Reset state if validation fails
      return;
    }

    // Only set submitting state if it's not already set (to avoid overriding external state)
    if (!isSubmitting) {
      setIsSubmitting(true);
    }

    try {
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

      reset();
      clearImages();

      // Stop typing indicator
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
      setIsSubmitting(false); // Reset state if validation fails
      return;
    }

    // Only set submitting state if it's not already set
    if (!isSubmitting) {
      setIsSubmitting(true);
    }

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
            stopTypingIndicator();
            setIsSubmitting(false);
          });
      } else {
        // No existing conversation - create new message
        const recipientIds = [recipientId]; // Ensure we're only passing the ID
        sendMessage(recipientIds, thumbsUpMessage).finally(() => {
          stopTypingIndicator();
          setIsSubmitting(false);
        });
      }
    } else if (activeConversation) {
      sendMessage([activeConversation], thumbsUpMessage).finally(() => {
        stopTypingIndicator();
        setIsSubmitting(false);
      });
    } else {
      stopTypingIndicator();
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
      clearImages();

      // Stop typing indicator
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