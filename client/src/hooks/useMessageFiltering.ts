import { useMemo } from 'react';
import { useChatStore } from '../store/chatStore';
import { userStore } from '../store/userStore';
import type { Message } from '../types';


interface UseMessageFilteringOptions {
  messages: Message[];
}

interface UseMessageFilteringReturn {
  filteredMessages: Message[];
  hasVisibleMessages: boolean;
}

export function useMessageFiltering({ 
  messages 
}: UseMessageFilteringOptions): UseMessageFilteringReturn {
  const { isUserBlockedByMe, amIBlockedByUser } = useChatStore();

  const filteredMessages = useMemo(() => {
    const currentUser = userStore.getState().user;

    return messages.filter((message) => {
      // Always show current user's own messages
      if (message.sender._id === currentUser?.id) {
        return true;
      }

      // For other users' messages, check blocking status
      const senderId = message.sender._id;
      const isBlocked = isUserBlockedByMe(senderId) || amIBlockedByUser(senderId);

      return !isBlocked;
    });
  }, [messages, isUserBlockedByMe, amIBlockedByUser]);

  const hasVisibleMessages = filteredMessages.length > 0;

  return {
    filteredMessages,
    hasVisibleMessages,
  };
}