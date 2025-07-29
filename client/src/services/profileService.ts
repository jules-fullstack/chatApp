import { API_BASE_URL } from "../config";
import type { ProfileUpdateForm } from "../schemas/profileSchema";

export interface ProfileUpdateData {
  firstName: string;
  lastName: string;
  userName: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface AvatarUploadData {
  file: File;
  parentType: string;
  parentId: string;
  usage: string;
}

class ProfileService {
  async updateProfile(data: ProfileUpdateForm) {
    const updateData: ProfileUpdateData = {
      firstName: data.firstName,
      lastName: data.lastName,
      userName: data.userName,
      ...(data.currentPassword &&
        data.newPassword && {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
    };

    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Profile update failed. Please try again.");
    }

    return response.json();
  }

  async uploadAvatar(data: AvatarUploadData) {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("parentType", data.parentType);
    formData.append("parentId", data.parentId);
    formData.append("usage", data.usage);

    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Avatar upload failed. Please try again.");
    }

    return response.json();
  }
}

export const profileService = new ProfileService();