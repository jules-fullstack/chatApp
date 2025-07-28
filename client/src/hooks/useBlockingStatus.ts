import { useState, useEffect } from "react";
import { useChatStore } from "../store/chatStore";
import { useConversationStore } from "../store/conversationStore";
import { API_BASE_URL } from "../config";

export function useBlockingStatus() {
  const [hasBlockedUser, setHasBlockedUser] = useState(false);
  const [isBlockedByUser, setIsBlockedByUser] = useState(false);
  
  const { checkIfBlockedBy, blockingUpdateTrigger } = useChatStore();
  const { 
    activeConversation, 
    conversations, 
    isNewMessage, 
    newMessageRecipients 
  } = useConversationStore();

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

  return {
    hasBlockedUser,
    isBlockedByUser,
  };
}