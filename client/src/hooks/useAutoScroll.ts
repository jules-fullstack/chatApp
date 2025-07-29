import { useRef, useCallback, useEffect } from 'react';

interface UseAutoScrollOptions {
  messages: any[];
  activeConversation: string | null;
}

interface UseAutoScrollReturn {
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: (smooth?: boolean) => void;
  scrollToBottomInstant: () => void;
}

export function useAutoScroll({ 
  messages, 
  activeConversation 
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(messages.length);
  const shouldAutoScrollRef = useRef(true);

  const scrollToBottom = useCallback((smooth = true) => {
    if (!messagesEndRef.current) return;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "instant",
        block: "end",
      });
    });
  }, []);

  const scrollToBottomInstant = useCallback(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  // ResizeObserver for container changes
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (shouldAutoScrollRef.current) {
        scrollToBottom(false);
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, [scrollToBottom]);

  // Auto-scroll logic when messages change
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = previousMessageCountRef.current;

    // If this is the first load (messages went from 0 to some number)
    if (previousMessageCount === 0 && currentMessageCount > 0) {
      // Scroll to bottom instantly on initial load
      setTimeout(() => scrollToBottomInstant(), 0);
      shouldAutoScrollRef.current = true;
    }
    // If new messages were added (not older messages loaded)
    else if (currentMessageCount > previousMessageCount) {
      const container = messagesContainerRef.current;
      if (container && shouldAutoScrollRef.current) {
        // Check if user is near the bottom before auto-scrolling
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        if (isNearBottom) {
          setTimeout(() => scrollToBottom(true), 0);
        }
      }
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages.length, scrollToBottom, scrollToBottomInstant]);

  // Monitor scroll position to determine auto-scroll behavior
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldAutoScrollRef.current = isNearBottom;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset auto-scroll when switching conversations
  useEffect(() => {
    shouldAutoScrollRef.current = true;
    previousMessageCountRef.current = 0;
  }, [activeConversation]);

  return {
    messagesEndRef,
    messagesContainerRef,
    scrollToBottom,
    scrollToBottomInstant,
  };
}