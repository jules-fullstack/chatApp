export interface Participant {
  _id: string;
  firstName: string;
  lastName: string;
  userName: string;
  avatar?: string;
}

export interface SearchedUser {
  _id: string;
  userName: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export interface SearchResponse {
  success: boolean;
  users: SearchedUser[];
}

export interface AvatarUser {
  _id: string;
  firstName: string;
  lastName: string;
  userName: string;
  avatar?: string;
}

export interface MessageTabProps {
  type?: "default" | "minimal";
  username: string;
  lastMessage?: string;
  unreadCount?: number;
  isActive?: boolean;
  onClick?: () => void;
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    userName?: string;
    avatar?: string;
  } | null;
  groupParticipants?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    userName?: string;
    avatar?: string;
  }[];
}


export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  role: "user" | "superAdmin";
  avatar?: string;
}

export interface Message {
  _id: string;
  conversation?: string;
  sender: User;
  content: string;
  messageType: "text" | "image" | "file";
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  isGroup: boolean;
  participant?: User; // For direct messages
  participants?: User[]; // For group messages
  groupName?: string;
  groupAdmin?: User;
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount: number;
  readAt?: Record<string, string>;
}
