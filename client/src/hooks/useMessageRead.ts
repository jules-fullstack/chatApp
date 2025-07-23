import { useEffect } from "react";
import { useIntersectionObserver } from "./useIntersectionObserver";
import { useConversationStore } from "../store/conversationStore";
import { userStore } from "../store/userStore";

export function useConversationRead(
  conversationId: string,
  isActiveConversation: boolean
) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.8,
    rootMargin: "0px",
  });

  const { markConversationAsRead } = useConversationStore();
  const currentUser = userStore.getState().user;

  useEffect(() => {
    // Only mark as read if:
    // 1. Content is visible in viewport
    // 2. User is actively viewing the conversation
    // 3. User is authenticated
    if (
      isIntersecting &&
      isActiveConversation &&
      currentUser?.id &&
      conversationId &&
      !conversationId.startsWith("user:")
    ) {
      // Small delay to ensure user actually saw the content
      const timer = setTimeout(() => {
        markConversationAsRead(conversationId);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    isIntersecting,
    isActiveConversation,
    conversationId,
    currentUser?.id,
    markConversationAsRead,
  ]);

  return { ref };
}
