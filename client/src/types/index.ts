export interface Media {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  metadata: {
    width?: number;
    height?: number;
    blurhash?: string;
    alt?: string;
  };
}

export interface Participant {
  _id: string;
  firstName: string;
  lastName: string;
  userName: string;
  avatar?: Media | string;
  lastActive?: Date | string;
}

export interface SearchedUser {
  _id: string;
  userName: string;
  firstName: string;
  lastName: string;
  avatar?: Media | string;
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
  avatar?: Media | string;
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
    avatar?: Media | string;
    lastActive?: Date | string;
  } | null;
  groupParticipants?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    userName?: string;
    avatar?: Media | string;
  }[];
  groupPhoto?: Media;
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  role: "user" | "superAdmin";
  avatar?: Media | string;
  lastActive?: Date | string;
}

export interface Message {
  _id: string;
  conversation?: string;
  sender: User;
  content: string;
  messageType: "text" | "image" | "file";
  attachments?: Media[];
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
  groupPhoto?: Media;
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount: number;
  readAt?: Record<string, string>;
}
