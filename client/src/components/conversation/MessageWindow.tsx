import { useEffect, useRef, useState, useCallback } from "react";
import {
  ConversationHeader,
  MessageSender,
  MessageList,
  TypingIndicator,
  EmptyStates,
} from "./";
import { Container, MessagesLoadingSpinner } from "../ui";
import { useChatStore } from "../../store/chatStore";
import { useConversationStore } from "../../store/conversationStore";
import { useConversationRead, useIntersectionObserverCallback, useMessageFiltering, useReadStatus  } from "../../hooks";
import type { Message } from "../../types";

export default function MessageWindow() {
  const { getTypingUsersForConversation } = useChatStore();

  const {
    activeConversation,
    messages,
    conversations,
    fallbackParticipant,
    isNewMessage,
    newMessageRecipients,
    isMessagesLoading,
    hasMoreMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
    loadMessages,
  } = useConversationStore();

  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const [previewMessages, setPreviewMessages] = useState<
    null | typeof messages
  >(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewConversationId, setPreviewConversationId] = useState<string | null>(null);
  const [previewHasMoreMessages, setPreviewHasMoreMessages] = useState(false);
  const [previewIsLoadingOlderMessages, setPreviewIsLoadingOlderMessages] = useState(false);
  
  const previewLoadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Use intersection observer to mark conversation as read when visible
  const { ref: conversationRef } = useConversationRead(
    activeConversation || "",
    !!activeConversation
  );

  // Message container ref for scroll functionality
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load older messages when user scrolls to top
  const handleLoadOlderMessages = useCallback(() => {
    if (activeConversation && hasMoreMessages && !isLoadingOlderMessages) {
      loadOlderMessages(activeConversation);
    }
  }, [
    activeConversation,
    hasMoreMessages,
    isLoadingOlderMessages,
    loadOlderMessages,
  ]);

  // Use intersection observer to trigger loading more messages
  useIntersectionObserverCallback({
    target: loadMoreTriggerRef,
    onIntersect: handleLoadOlderMessages,
    enabled: hasMoreMessages && !isLoadingOlderMessages,
  });

  // Load older messages for preview window
  const handleLoadOlderPreviewMessages = useCallback(() => {
    if (previewConversationId && previewHasMoreMessages && !previewIsLoadingOlderMessages) {
      setPreviewIsLoadingOlderMessages(true);
      loadOlderMessages(previewConversationId)
        .then(() => {
          // Update preview messages with the new data from store
          const currentMessages = useConversationStore.getState().messages;
          setPreviewMessages([...currentMessages]);
          // Update hasMoreMessages state based on the store
          const currentHasMore = useConversationStore.getState().hasMoreMessages;
          setPreviewHasMoreMessages(currentHasMore);
        })
        .finally(() => setPreviewIsLoadingOlderMessages(false));
    }
  }, [
    previewConversationId,
    previewHasMoreMessages,
    previewIsLoadingOlderMessages,
    loadOlderMessages,
  ]);

  // Use intersection observer to trigger loading more preview messages
  useIntersectionObserverCallback({
    target: previewLoadMoreTriggerRef,
    onIntersect: handleLoadOlderPreviewMessages,
    enabled: previewHasMoreMessages && !previewIsLoadingOlderMessages,
  });

  useEffect(() => {
    const shouldPreview =
      isNewMessage && newMessageRecipients.length === 1 && !activeConversation;

    if (shouldPreview) {
      const recipientId = newMessageRecipients[0]._id;
      // Find direct conversation with this user
      const directConversation = conversations.find(
        (conv) =>
          !conv.isGroup &&
          ((conv.participant && conv.participant._id === recipientId) ||
            // fallback for some data shapes
            (conv.participants &&
              conv.participants.length === 2 &&
              conv.participants.some((p) => p._id === recipientId)))
      );

      if (directConversation) {
        setPreviewLoading(true);
        setPreviewConversationId(directConversation._id);
        // Load messages but do NOT set activeConversation
        loadMessages(directConversation._id)
          .then(() => {
            // After loading, copy messages from store
            const storeState = useConversationStore.getState();
            setPreviewMessages([...storeState.messages]);
            setPreviewHasMoreMessages(storeState.hasMoreMessages);
          })
          .finally(() => setPreviewLoading(false));
      } else {
        setPreviewMessages([]);
        setPreviewConversationId(null);
        setPreviewHasMoreMessages(false);
      }
    } else {
      setPreviewMessages(null);
      setPreviewLoading(false);
      setPreviewConversationId(null);
      setPreviewHasMoreMessages(false);
      setPreviewIsLoadingOlderMessages(false);
    }
    // Only run when newMessageRecipients, isNewMessage, conversations change
  }, [
    isNewMessage,
    newMessageRecipients,
    conversations,
    activeConversation,
    loadMessages,
  ]);

  // Find the active conversation details
  const activeConversationData =
    conversations.find((conv) => conv._id === activeConversation) ||
    (fallbackParticipant && {
      participant: fallbackParticipant,
      isGroup: false,
    });

  const typingUsersArray = getTypingUsersForConversation();
  const isTyping = typingUsersArray.length > 0;

  // Message filtering
  const { filteredMessages, hasVisibleMessages } = useMessageFiltering({
    messages,
  });

  // Read status tracking
  const { getUsersWhoLastReadEachMessage } = useReadStatus({
    messages: filteredMessages,
    activeConversationData:
      activeConversationData && "_id" in activeConversationData
        ? activeConversationData
        : undefined,
  });

  const usersWhoLastReadEachMessage = getUsersWhoLastReadEachMessage();

  const renderMessages = () => {
    if (isMessagesLoading) {
      return <MessagesLoadingSpinner />;
    }

    if (!hasVisibleMessages) {
      return <EmptyStates type="noMessages" />;
    }

    return (
      <MessageList
        messages={filteredMessages as Message[]}
        hasMoreMessages={hasMoreMessages}
        isLoadingOlderMessages={isLoadingOlderMessages}
        loadMoreTriggerRef={loadMoreTriggerRef}
        activeConversationData={
          activeConversationData && "_id" in activeConversationData
            ? activeConversationData
            : undefined
        }
        usersWhoLastReadEachMessage={usersWhoLastReadEachMessage}
      />
    );
  };

  // Show default view if no active conversation and not in new message mode
  if (!activeConversation && !isNewMessage && !isMessagesLoading) {
    return (
      <Container size="lg">
        <EmptyStates type="default" />
      </Container>
    );
  }

  // Show new message view if in new message mode but no recipients selected
  if (isNewMessage && newMessageRecipients.length === 0) {
    return (
      <Container size="lg">
        <ConversationHeader />
        <EmptyStates type="newMessage" />
      </Container>
    );
  }

  // Show message preview if in new message mode and recipient has existing conversation
  if (
    isNewMessage &&
    newMessageRecipients.length === 1 &&
    !activeConversation
  ) {
    return (
      <Container size="lg">
        <ConversationHeader />
        <div className="flex-1 overflow-y-auto p-4 pb-20 flex flex-col-reverse">
          <div className="flex flex-col-reverse">
            {previewLoading ? (
              <MessagesLoadingSpinner />
            ) : previewMessages && previewMessages.length > 0 ? (
              <MessageList
                messages={previewMessages}
                hasMoreMessages={previewHasMoreMessages}
                isLoadingOlderMessages={previewIsLoadingOlderMessages}
                loadMoreTriggerRef={previewLoadMoreTriggerRef}
                activeConversationData={conversations.find(
                  (conv) => conv._id === previewConversationId
                )}
                usersWhoLastReadEachMessage={new Map()} // No read status for preview
              />
            ) : (
              <EmptyStates type="noMessages" />
            )}
          </div>
        </div>
        <MessageSender />
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
        conversation={
          isNewMessage ? undefined : activeConversationData || undefined
        }
        isTyping={isTyping}
      />

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 pb-20 flex flex-col-reverse"
      >
        <div ref={conversationRef} className="flex flex-col-reverse">
          {isTyping && <TypingIndicator typingUsers={typingUsersArray} />}
          {renderMessages()}
        </div>
      </div>

      <MessageSender />
    </Container>
  );
}
