import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { userStore } from "../store/userStore";
import { profileService } from "../services/profileService";
import { profileUpdateSchema, type ProfileUpdateForm } from "../schemas/profileSchema";
import { validateAvatarFile, resetFileInput } from "../utils/profileUtils";

export const useProfileManagement = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isOpen, { open, close }] = useDisclosure(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const user = userStore((state) => state.user);
  const setUser = userStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileUpdateForm>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      userName: user?.userName || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleProfileUpdate = async (data: ProfileUpdateForm) => {
    setIsUpdating(true);
    try {
      const result = await profileService.updateProfile(data);
      
      // Update the user in the store
      setUser(result.user);
      
      // Reset form with new values
      reset({
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        userName: result.user.userName,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      close();
      
      notifications.show({
        title: "Success",
        message: "Profile updated successfully!",
        color: "green",
      });
    } catch (error) {
      console.error("Error during profile update:", error);
      notifications.show({
        title: "Update Failed",
        message: error instanceof Error ? error.message : "An error occurred. Please try again.",
        color: "red",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const validation = validateAvatarFile(file);
    
    if (!validation.isValid) {
      notifications.show({
        title: "Invalid File",
        message: validation.error!,
        color: "red",
      });
      return;
    }

    if (!user || !file) return;

    setIsUploadingAvatar(true);

    try {
      const result = await profileService.uploadAvatar({
        file,
        parentType: "User",
        parentId: user.id,
        usage: "avatar",
      });
      
      // Update user with new avatar Media object
      setUser({ ...user, avatar: result.media });
      
      notifications.show({
        title: "Success",
        message: "Avatar uploaded successfully!",
        color: "green",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      notifications.show({
        title: "Upload Failed",
        message: error instanceof Error ? error.message : "An error occurred while uploading. Please try again.",
        color: "red",
      });
    } finally {
      setIsUploadingAvatar(false);
      resetFileInput(fileInputRef);
    }
  };

  const handleModalOpen = () => {
    // Reset form with current user data when opening modal
    reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      userName: user?.userName || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    open();
  };

  return {
    // State
    isUpdating,
    isUploadingAvatar,
    isOpen,
    fileInputRef,
    user,
    
    // Form
    register,
    handleSubmit,
    errors,
    
    // Actions
    handleProfileUpdate,
    handleAvatarUpload,
    handleModalOpen,
    close,
  };
};