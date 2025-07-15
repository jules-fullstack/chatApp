import { create } from "zustand";
import { userStore } from "./userStore";
import { type Participant } from "../types";

interface Message {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    userName: string;
  };
  recipient: {
    _id: string;
    firstName: string;
    lastName: string;
    userName: string;
  };
  content: string;
  messageType: "text" | "image" | "file";
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  _id: string;
  participant: {
    _id: string;
    firstName: string;
    lastName: string;
    userName: string;
  };
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount: number;
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
  typingUsers: Set<string>;

  isConversationsLoading: boolean;
  isMessagesLoading: boolean;

  fallbackParticipant: Participant | null;
  setFallbackParticipant: (participant: Participant | null) => void;

  // New message state
  isNewMessage: boolean;
  newMessageRecipient: Participant | null;
  setNewMessage: (isNew: boolean, recipient?: Participant) => void;

  // Actions
  connect: () => void;
  disconnect: () => void;
  setActiveConversation: (userId: string) => void;
  startNewMessage: () => void;

  // Message actions
  sendMessage: (recipientId: string, content: string) => Promise<void>;
  loadMessages: (userId: string) => Promise<void>;
  loadConversations: () => Promise<void>;

  // Real-time actions
  handleIncomingMessage: (message: Message) => void;
  startTyping: (recipientId: string) => void;
  stopTyping: (recipientId: string) => void;
  setTypingUser: (userId: string, isTyping: boolean) => void;

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
  typingUsers: new Set(),
  fallbackParticipant: null,
  isNewMessage: false,
  newMessageRecipient: null,
  isConversationsLoading: false,
  isMessagesLoading: false,

  setFallbackParticipant: (participant: Participant | null) => {
    set({ fallbackParticipant: participant });
  },

  setNewMessage: (isNew: boolean, recipient?: Participant) => {
    set({
      isNewMessage: isNew,
      newMessageRecipient: recipient || null,
      messages: isNew ? [] : get().messages,
    });
  },

  startNewMessage: () => {
    set({
      isNewMessage: true,
      newMessageRecipient: null,
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
        case "user_typing":
          get().setTypingUser(data.userId, data.isTyping);
          break;
        case "message_read":
          // Handle message read status
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

  setActiveConversation: (userId: string) => {
    set({
      activeConversation: userId,
      messages: [],
      isNewMessage: false,
      newMessageRecipient: null,
    });
    get().loadMessages(userId);
  },

  sendMessage: async (recipientId: string, content: string) => {
    try {
      const response = await fetch(`${API_BASE}/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recipientId,
          content,
          messageType: "text",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const result = await response.json();

      set((state) => ({
        messages: [...state.messages, result.data],
        isNewMessage: false,
        newMessageRecipient: null,
        activeConversation: recipientId,
      }));

      get().loadConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  loadMessages: async (userId: string) => {
    set({ isMessagesLoading: true });
    try {
      const response = await fetch(
        `${API_BASE}/messages/conversation/${userId}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      const result = await response.json();
      set({ messages: result.messages });
    } catch (error) {
      console.error("Error loading messages:", error);
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

    // If this message is for the active conversation, add it to messages
    if (activeConversation === message.sender._id) {
      set((state) => ({
        messages: [...state.messages, message],
      }));
    }

    // Refresh conversations to update last message and unread count
    get().loadConversations();
  },

  startTyping: (recipientId: string) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "typing",
          recipientId,
        })
      );
    }
  },

  stopTyping: (recipientId: string) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "stop_typing",
          recipientId,
        })
      );
    }
  },

  setTypingUser: (userId: string, isTyping: boolean) => {
    set((state) => {
      const newTypingUsers = new Set(state.typingUsers);
      if (isTyping) {
        newTypingUsers.add(userId);
      } else {
        newTypingUsers.delete(userId);
      }
      return { typingUsers: newTypingUsers };
    });
  },

  resetStore: () => {
    set({
      ws: null,
      isConnected: false,
      activeConversation: null,
      messages: [],
      conversations: [],
      isTyping: false,
      typingUsers: new Set(),
      fallbackParticipant: null,
      isNewMessage: false,
      newMessageRecipient: null,
    });
  },
}));
