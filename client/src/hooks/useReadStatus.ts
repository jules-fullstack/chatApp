import { useMemo } from 'react';
import { userStore } from '../store/userStore';

interface Message {
  _id: string;
  sender: {
    _id: string;
    userName?: string;
  };
  createdAt: string;
  content?: string;
  messageType?: string;
}

interface Participant {
  _id: string;
  userName?: string;
  email?: string;
}

interface ConversationData {
  _id: string;
  isGroup: boolean;
  participant?: Participant;
  participants?: Participant[];
  readAt?: Record<string, string>;
}

interface UseReadStatusOptions {
  messages: Message[];
  activeConversationData?: ConversationData;
}

interface UseReadStatusReturn {
  getUsersWhoLastReadEachMessage: () => Map<number, string[]>;
}

export function useReadStatus({ 
  messages, 
  activeConversationData 
}: UseReadStatusOptions): UseReadStatusReturn {
  const getUsersWhoLastReadEachMessage = useMemo(() => {
    return () => {
      if (!activeConversationData) return new Map();

      const currentUser = userStore.getState().user;
      const messageToUsersMap = new Map<number, string[]>(); // messageIndex -> array of userIds

      // Get all participants except current user
      const participants = activeConversationData.isGroup
        ? activeConversationData.participants?.filter(
            (p) => p._id !== currentUser?.id
          ) || []
        : activeConversationData.participant
          ? [activeConversationData.participant]
          : [];

      participants.forEach((participant) => {
        const userReadAt = activeConversationData.readAt?.[participant._id];
        if (userReadAt) {
          const readAtTime = new Date(userReadAt).getTime();

          // Find the last message that was sent by current user before the read timestamp
          let lastReadIndex = -1;
          for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            const messageTime = new Date(message.createdAt).getTime();

            // Only consider messages sent by current user
            if (
              message.sender._id === currentUser?.id &&
              messageTime <= readAtTime
            ) {
              lastReadIndex = i;
              break;
            }
          }

          if (lastReadIndex !== -1) {
            // Add this participant to the users who last read this message
            const existingUsers = messageToUsersMap.get(lastReadIndex) || [];
            messageToUsersMap.set(lastReadIndex, [
              ...existingUsers,
              participant._id,
            ]);
          }
        }
      });

      return messageToUsersMap;
    };
  }, [messages, activeConversationData]);

  return {
    getUsersWhoLastReadEachMessage,
  };
}