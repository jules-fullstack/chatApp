import React, { type ReactElement } from 'react';
import { MessageBubble, TimestampSeparator } from './';
import { OlderMessagesLoadingSpinner } from '../ui';
import { shouldShowTimeSeparator } from '../../utils/dateUtils';
import { userStore } from '../../store/userStore';
import type { Message, Conversation } from '../../types';


interface MessageListProps {
  messages: Message[];
  hasMoreMessages: boolean;
  isLoadingOlderMessages: boolean;
  loadMoreTriggerRef: React.RefObject<HTMLDivElement | null>;
  activeConversationData?: Conversation;
  usersWhoLastReadEachMessage: Map<number, string[]>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  hasMoreMessages,
  isLoadingOlderMessages,
  loadMoreTriggerRef,
  activeConversationData,
  usersWhoLastReadEachMessage,
}) => {
  const renderedElements: ReactElement[] = [];

  // Add load more trigger at the top if there are more messages
  if (hasMoreMessages) {
    renderedElements.push(
      <div
        key="load-more-trigger"
        ref={loadMoreTriggerRef}
        className="flex justify-center py-4"
      >
        {isLoadingOlderMessages ? (
          <OlderMessagesLoadingSpinner />
        ) : (
          <div className="text-gray-400 text-sm">
            Scroll up to load older messages
          </div>
        )}
      </div>
    );
  }

  messages.forEach((message, index) => {
    const isLast = index === messages.length - 1;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    const currentUser = userStore.getState().user;
    const isOwnMessage = currentUser?.id === message.sender._id;

    // Check if we should show a timestamp separator
    const showSeparator = shouldShowTimeSeparator(
      message.createdAt,
      previousMessage?.createdAt || null
    );

    // Add timestamp separator if needed
    if (showSeparator) {
      renderedElements.push(
        <TimestampSeparator
          key={`separator-${message._id}`}
          timestamp={message.createdAt}
        />
      );
    }

    // Check if there will be a timestamp separator after this message
    const nextMessageShowsSeparator = nextMessage
      ? shouldShowTimeSeparator(nextMessage.createdAt, message.createdAt)
      : false;

    const nextMessageIsGroupEvent = nextMessage?.messageType === "groupEvent";

    // Determine if we should show avatar for this message
    // Only show avatar for other users' messages (not own messages)
    // Show avatar only if:
    // 1. This is not the current user's message
    // 2. This is the last message in a sequence from the same sender, which happens when:
    //    - This is the last message overall OR
    //    - Next message is from a different sender OR
    //    - There will be a timestamp separator after this message (breaking the sequence)
    const showAvatar =
      !isOwnMessage &&
      (isLast || // Last message overall
        (nextMessage && nextMessage.sender._id !== message.sender._id) || // Next message from different sender
        nextMessageShowsSeparator ||
        nextMessageIsGroupEvent); // Timestamp separator will break the sequence

    // Get the users who last read this specific message
    const usersWhoLastReadThisMessage =
      usersWhoLastReadEachMessage.get(index) || [];

    // Add the message bubble
    renderedElements.push(
      <MessageBubble
        key={message._id}
        message={message}
        isLast={isLast}
        conversation={activeConversationData}
        usersWhoLastReadThisMessage={usersWhoLastReadThisMessage}
        showAvatar={showAvatar}
      />
    );
  });

  return <>{renderedElements}</>;
};

export default MessageList;