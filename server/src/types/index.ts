import { Document, Types } from 'mongoose';
import './session.js';

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
  avatar?: Types.ObjectId;
  otp?: string;
  otpExpiry?: Date;
  isEmailVerified: boolean;
  role: 'user' | 'superAdmin';
  isBlocked: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateOTP(): string;
  verifyOTP(inputOTP: string): boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OTPVerifyRequest {
  email: string;
  otp: string;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    userName: string;
  };
}

export interface AuthResponse {
  message: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
    role: 'user' | 'superAdmin';
    avatar?: string | null;
  };
  remainingAttempts?: number;
  timeUntilReset?: number;
}

export interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  isGroup: boolean;
  groupName?: string | null;
  groupAdmin?: Types.ObjectId;
  lastMessage?: Types.ObjectId;
  lastMessageAt: Date;
  isActive: boolean;
  unreadCount: Map<string, number>;
  readAt: Map<string, Date>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMedia extends Document {
  _id: Types.ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storageKey: string;
  parentType: 'User' | 'Message';
  parentId: Types.ObjectId;
  usage: 'avatar' | 'attachment';
  metadata: {
    width?: number;
    height?: number;
    blurhash?: string;
    alt?: string;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file';
  attachments?: Types.ObjectId[];
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface User extends IUser {}
  }
}
