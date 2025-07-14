export interface Participant {
  _id: string;
  firstName: string;
  lastName: string;
  userName: string;
}

export interface SearchedUser {
  _id: string;
  userName: string;
  firstName: string;
  lastName: string;
}

export interface SearchResponse {
  success: boolean;
  users: SearchedUser[];
}

export interface MessageTabProps {
  type?: "default" | "minimal";
  username: string;
  lastMessage?: string;
  unreadCount?: number;
  isActive?: boolean;
  onClick?: () => void;
}

export interface MessageFormData {
  message: string;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  role: "user" | "superAdmin";
}

export interface Message {
  _id: string;
  sender: User;
  recipient: User;
  content: string;
  messageType: "text" | "image" | "file";
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  participant: User;
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount: number;
}
