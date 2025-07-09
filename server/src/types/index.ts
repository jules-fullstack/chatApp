import { Document, Types } from 'mongoose';
import './session.js';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  otp?: string;
  otpExpiry?: Date;
  isEmailVerified: boolean;
  role: 'user' | 'superAdmin';
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateOTP(): string;
  verifyOTP(inputOTP: string): boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterRequest {
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

export interface AuthResponse {
  message: string;
  user?: {
    id: string;
    email: string;
    role: 'user' | 'superAdmin';
  };
}

declare global {
  namespace Express {
    interface User extends IUser {}
  }
}
