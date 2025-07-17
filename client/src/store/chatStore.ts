import { create } from "zustand";
import { userStore } from "./userStore";
import { type Participant, type Message, type Conversation } from "../types";

interface TypingUser {
  userId: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
}

interface ChatState {
  // WebSocket connection
  ws: WebSocket | null;
  isConnected: boolean;

  // Active conversation
  activeConversation: string | null;

  // Messages
  messages: Message[];
  conversations: Conversation[];

  // UI state
  isTyping: boolean;
  typingUsers: Map<string, TypingUser>;

  isConversationsLoading: boolean;
  isMessagesLoading: boolean;

  fallbackParticipant: Participant | null;
  setFallbackParticipant: (participant: Participant | null) => void;

  // New message state
  isNewMessage: boolean;
  newMessageRecipients: Participant[];
  setNewMessage: (isNew: boolean, recipients?: Participant[]) => void;
  addRecipient: (recipient: Participant) => void;
  removeRecipient: (recipientId: string) => void;
  clearRecipients: () => void;

  // Actions
  connect: () => void;
  disconnect: () => void;
  setActiveConversation: (userId: string) => void;
  startNewMessage: () => void;

  // Message actions
  sendMessage: (
    recipientIds: string[],
    content: string,
    groupName?: string
  ) => Promise<void>;
  loadMessages: (userId: string) => Promise<void>;
  loadConversations: () => Promise<void>;

  // Real-time actions
  handleIncomingMessage: (message: Message) => void;
  startTyping: (recipientId: string) => void;
  stopTyping: (recipientId: string) => void;
  setTypingUser: (
    userId: string,
    isTyping: boolean,
    userInfo?: Partial<TypingUser>
  ) => void;
  getTypingUsersForConversation: () => TypingUser[];
  getUserInfoFromConversations: (userId: string) => Partial<TypingUser>;

  // Read status actions
  markConversationAsRead: (conversationId: string) => Promise<void>;
  handleConversationRead: (data: any) => void;

  resetStore: () => void;
}

const API_BASE = "http://localhost:3000/api";

export const useChatStore = create<ChatState>((set, get) => ({
  ws: null,
  isConnected: false,
  activeConversation: null,
  messages: [],
  conversations: [],
  isTyping: false,
  typingUsers: new Map(),
  fallbackParticipant: null,
  isNewMessage: false,
  newMessageRecipients: [],
  isConversationsLoading: false,
  isMessagesLoading: false,

  setFallbackParticipant: (participant: Participant | null) => {
    set({ fallbackParticipant: participant });
  },

  setNewMessage: (isNew: boolean, recipients?: Participant[]) => {
    set({
      isNewMessage: isNew,
      newMessageRecipients: recipients || [],
      messages: isNew ? [] : get().messages,
    });
  },

  addRecipient: (recipient: Participant) => {
    const current = get().newMessageRecipients;
    if (!current.find((r) => r._id === recipient._id)) {
      set({
        newMessageRecipients: [...current, recipient],
      });
    }
  },

  removeRecipient: (recipientId: string) => {
    set({
      newMessageRecipients: get().newMessageRecipients.filter(
        (r) => r._id !== recipientId
      ),
    });
  },

  clearRecipients: () => {
    set({ newMessageRecipients: [] });
  },

  startNewMessage: () => {
    set({
      isNewMessage: true,
      newMessageRecipients: [],
      activeConversation: null,
      messages: [],
      fallbackParticipant: null,
    });
  },

  connect: () => {
    const user = userStore.getState().user;
    if (!user || get().ws) return;

    const ws = new WebSocket("ws://localhost:3000/api/chat");

    ws.onopen = () => {
      set({ ws, isConnected: true });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "new_message":
          get().handleIncomingMessage(data.message);
          break;
        case "user_typing": {
          // Only show typing indicator if it's for the active conversation
          const { activeConversation } = get();

          // Check if this typing indicator is for the current active conversation
          let shouldShowTyping = false;

          if (activeConversation) {
            if (activeConversation.startsWith("user:")) {
              // Direct message with user: format - check if the typing user is the same as the target user
              const targetUserId = activeConversation.replace("user:", "");
              shouldShowTyping = data.userId === targetUserId;
            } else {
              // Group chat or existing conversation - check conversation ID
              shouldShowTyping = data.conversationId === activeConversation;
            }
          }

          if (shouldShowTyping) {
            // Try to get user info from conversations
            const userInfo = get().getUserInfoFromConversations(data.userId);
            get().setTypingUser(data.userId, data.isTyping, userInfo);
          }
          break;
        }
        case "conversation_read":
          get().handleConversationRead(data);
          break;
        default:
          console.log("Unknown WebSocket message:", data);
      }
    };

    ws.onclose = () => {
      set({ ws: null, isConnected: false });
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      set({ ws: null, isConnected: false });
    };
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, isConnected: false });
    }
  },

  setActiveConversation: (conversationId: string) => {
    set({
      activeConversation: conversationId,
      messages: [],
      isNewMessage: false,
      newMessageRecipients: [],
    });
    get().loadMessages(conversationId);

    // Also mark conversation as read when switching to it (for immediate UI update)
    if (!conversationId.startsWith("user:")) {
      get().markConversationAsRead(conversationId);
    }
  },

  sendMessage: async (
    targets: string[],
    content: string,
    groupName?: string
  ) => {
    try {
      const { isNewMessage, activeConversation } = get();

      let requestBody;
      if (isNewMessage) {
        // New message - send to multiple recipients
        requestBody = {
          recipientIds: targets,
          content,
          messageType: "text",
          ...(groupName !== undefined && { groupName }),
        };
      } else if (activeConversation?.startsWith("user:")) {
        // Direct message to a user (new conversation)
        const userId = activeConversation.replace("user:", "");
        requestBody = {
          recipientIds: [userId],
          content,
          messageType: "text",
        };
      } else {
        // Existing conversation - send to conversation
        requestBody = {
          conversationId: activeConversation,
          content,
          messageType: "text",
        };
      }

      const response = await fetch(`${API_BASE}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const result = await response.json();

      set((state) => ({
        messages: [...state.messages, result.data],
        isNewMessage: false,
        newMessageRecipients: [],
        activeConversation: result.data.conversation || activeConversation,
      }));

      get().loadConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  loadMessages: async (conversationId: string) => {
    set({ isMessagesLoading: true });
    try {
      let url;
      if (conversationId.startsWith("user:")) {
        // Direct message to a user - use legacy endpoint
        const userId = conversationId.replace("user:", "");
        url = `${API_BASE}/messages/conversation/user/${userId}`;
      } else {
        // Existing conversation
        url = `${API_BASE}/messages/conversation/${conversationId}`;
      }

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        // If conversation doesn't exist yet, that's okay
        if (response.status === 403 || response.status === 404) {
          set({ messages: [] });
          return;
        }
        throw new Error("Failed to load messages");
      }

      const result = await response.json();
      set({ messages: result.messages || [] });
    } catch (error) {
      console.error("Error loading messages:", error);
      set({ messages: [] });
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  loadConversations: async () => {
    set({ isConversationsLoading: true });
    try {
      const response = await fetch(`${API_BASE}/messages/conversations`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }

      const conversations = await response.json();
      set({ conversations });
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      set({ isConversationsLoading: false });
    }
  },

  handleIncomingMessage: (message: Message) => {
    const { activeConversation } = get();

    // Ensure message has required properties
    if (!message || !message.sender) {
      console.error("Invalid message received:", message);
      return;
    }

    // If this message is for the active conversation, add it to messages
    // For group chats, we need to check the conversation ID
    if (message.conversation && activeConversation === message.conversation) {
      set((state) => ({
        messages: [...state.messages, message],
      }));
    } else if (
      !message.conversation &&
      activeConversation === message.sender._id
    ) {
      // Legacy direct message handling
      set((state) => ({
        messages: [...state.messages, message],
      }));
    }

    // Refresh conversations to update last message and unread count
    get().loadConversations();
  },

  startTyping: (target: string) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (target.startsWith("user:")) {
        // Direct message with user: format
        const recipientId = target.replace("user:", "");
        const message = {
          type: "typing",
          recipientId,
          conversationId: recipientId,
        };
        ws.send(JSON.stringify(message));
      } else {
        // Group chat or existing conversation - send only conversationId
        const message = {
          type: "typing",
          conversationId: target,
        };
        ws.send(JSON.stringify(message));
      }
    } else {
      console.log("DEBUG: WebSocket not ready, readyState:", ws?.readyState);
    }
  },

  stopTyping: (target: string) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (target.startsWith("user:")) {
        // Direct message with user: format
        const recipientId = target.replace("user:", "");
        ws.send(
          JSON.stringify({
            type: "stop_typing",
            recipientId,
            conversationId: recipientId,
          })
        );
      } else {
        // Group chat or existing conversation - send only conversationId
        ws.send(
          JSON.stringify({
            type: "stop_typing",
            conversationId: target,
          })
        );
      }
    }
  },

  setTypingUser: (
    userId: string,
    isTyping: boolean,
    userInfo?: Partial<TypingUser>
  ) => {
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      if (isTyping) {
        const typingUser: TypingUser = {
          userId,
          userName: userInfo?.userName,
          firstName: userInfo?.firstName,
          lastName: userInfo?.lastName,
        };
        newTypingUsers.set(userId, typingUser);
      } else {
        newTypingUsers.delete(userId);
      }
      return { typingUsers: newTypingUsers };
    });
  },

  getUserInfoFromConversations: (userId: string) => {
    const { conversations } = get();

    // Find the user in conversations
    for (const conversation of conversations) {
      if (conversation.isGroup && conversation.participants) {
        const participant = conversation.participants.find(
          (p) => p._id === userId
        );
        if (participant) {
          return {
            userName: participant.userName,
            firstName: participant.firstName,
            lastName: participant.lastName,
          };
        }
      } else if (
        !conversation.isGroup &&
        conversation.participant &&
        conversation.participant._id === userId
      ) {
        return {
          userName: conversation.participant.userName,
          firstName: conversation.participant.firstName,
          lastName: conversation.participant.lastName,
        };
      }
    }
    return {};
  },

  getTypingUsersForConversation: () => {
    const { typingUsers } = get();
    return Array.from(typingUsers.values());
  },

  markConversationAsRead: async (conversationId: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/messages/conversation/${conversationId}/read`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark conversation as read");
      }

      const result = await response.json();
      const currentUserId = userStore.getState().user?.id || "";

      // Update local state - update conversation read timestamp and unread count
      set((state) => ({
        conversations: state.conversations.map((conv) => {
          if (conv._id === conversationId) {
            const updatedConv = {
              ...conv,
              unreadCount: 0,
              readAt: {
                ...conv.readAt,
                [currentUserId]: result.readAt || new Date().toISOString(),
              },
            };
            return updatedConv;
          }
          return conv;
        }),
      }));
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  },

  handleConversationRead: (data: any) => {
    const { conversationId, readBy, readAt } = data;

    // Update conversation read timestamp in local state
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv._id === conversationId) {
          const updatedConv = {
            ...conv,
            readAt: {
              ...conv.readAt,
              [readBy.userId]: readAt || new Date().toISOString(),
            },
          };
          return updatedConv;
        }
        return conv;
      }),
    }));
  },

  resetStore: () => {
    set({
      ws: null,
      isConnected: false,
      activeConversation: null,
      messages: [],
      conversations: [],
      isTyping: false,
      typingUsers: new Map(),
      fallbackParticipant: null,
      isNewMessage: false,
      newMessageRecipients: [],
    });
  },
}));
