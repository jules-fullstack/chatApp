import type { Media } from "./index";

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  role: "user" | "superAdmin";
  isEmailVerified: boolean;
  isBlocked: boolean;
  avatar?: Media | string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminParticipant {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
}

export interface AdminGroupConversation {
  id: string;
  groupName?: string;
  participants: AdminParticipant[];
  groupAdmin?: AdminParticipant;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedUsersResponse {
  users: AdminUser[];
  pagination: PaginationInfo;
}

export interface PaginatedGroupConversationsResponse {
  conversations: AdminGroupConversation[];
  pagination: PaginationInfo;
}