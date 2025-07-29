import type { Media } from "../types";

// Match the User interface from userStore
interface UserStoreUser {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  role: "user" | "superAdmin";
  avatar?: Media | string;
}

export interface AvatarUser {
  _id: string;
  firstName: string;
  lastName: string;
  userName: string;
  avatar?: Media | string;
}

/**
 * Transform user data for Avatar component
 */
export const transformUserForAvatar = (user: UserStoreUser | null): AvatarUser | null => {
  if (!user) return null;
  
  return {
    _id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    userName: user.userName,
    avatar: user.avatar,
  };
};

/**
 * Validate uploaded file for avatar
 */
export const validateAvatarFile = (file: File | null | undefined): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: "No file selected" };
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return { isValid: false, error: "Please select an image file." };
  }

  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    return { isValid: false, error: "Image must be less than 5MB." };
  }

  return { isValid: true };
};

/**
 * Reset file input value
 */
export const resetFileInput = (fileInputRef: React.RefObject<HTMLInputElement | null>) => {
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
};