import type { Message } from "../types";

export interface TypingUser {
  userId: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface StoreActions {
  // Connection state
  setConnectionState: (isConnected: boolean) => void;
  setWebSocket: (ws: WebSocket | null) => void;
  
  // Online users
  setUserOnline: (userId: string, isOnline: boolean) => void;
  clearOnlineUsers: () => void;
  
  // Typing
  setTypingUser: (userId: string, isTyping: boolean, userInfo?: Partial<TypingUser>) => void;
  getUserInfoFromConversations: (userId: string) => Partial<TypingUser>;
  
  // Messages and conversations
  handleIncomingMessage: (message: Message) => void;
  loadConversations: () => Promise<void>;
  loadBlockingData: () => Promise<void>;
  
  // Group handlers
  handleConversationRead: (data: unknown) => void;
  handleGroupNameUpdated: (data: unknown) => void;
  handleGroupPhotoUpdated: (data: unknown) => void;
  handleUserLeftGroup: (data: unknown) => void;
  handleMembersAddedToGroup: (data: unknown) => void;
  handleGroupAdminChanged: (data: unknown) => void;
  handleMemberRemovedFromGroup: (data: unknown) => void;
  handleRemovedFromGroup: (data: unknown) => void;
  
  // Blocking
  handleBlockingUpdate: (data: unknown) => void;
  triggerBlockingUpdate: () => void;
  resetStore: () => void;
  
  // State getters
  getState: () => {
    activeConversation: string | null;
  };
}

export interface MessageHandlers {
  [messageType: string]: (data: unknown, actions: StoreActions) => void;
}