import { useState, useEffect, useRef } from "react";
import { useChatStore } from "../store/chatStore";
import { userStore } from "../store/userStore";
import { useLogout } from "../hooks/useLogout";
import {
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import Sidebar from "../components/Sidebar";
import MessageWindow from "../components/MessageWindow";
import { useDisclosure } from "@mantine/hooks";
import { Menu, Modal, Button, Group, LoadingOverlay } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormField from "../components/ui/FormField";
import ConversationDetails from "../components/ConversationDetails";
import Avatar from "../components/ui/Avatar";

// Zod schema for profile update
const profileUpdateSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name must be less than 50 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name must be less than 50 characters"),
    userName: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be less than 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),
    currentPassword: z.string().optional().or(z.literal("")),
    newPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      // If any password field is filled, all must be filled
      const hasCurrentPassword =
        data.currentPassword && data.currentPassword.trim() !== "";
      const hasNewPassword = data.newPassword && data.newPassword.trim() !== "";
      const hasConfirmPassword =
        data.confirmPassword && data.confirmPassword.trim() !== "";

      if (hasCurrentPassword || hasNewPassword || hasConfirmPassword) {
        return hasCurrentPassword && hasNewPassword && hasConfirmPassword;
      }
      return true;
    },
    {
      message: "If changing password, all password fields are required",
      path: ["currentPassword"],
    }
  )
  .refine(
    (data) => {
      // If new password is provided, it must meet length requirements
      if (data.newPassword && data.newPassword.trim() !== "") {
        return data.newPassword.length >= 6 && data.newPassword.length <= 100;
      }
      return true;
    },
    {
      message: "New password must be between 6 and 100 characters",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) => {
      // New password and confirm password must match
      if (data.newPassword && data.confirmPassword) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: "New password and confirm password must match",
      path: ["confirmPassword"],
    }
  );

type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;

export default function UserDashboard() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isOpen, { open, close }] = useDisclosure(false);
  const { logout, isLoggingOut } = useLogout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = userStore((state) => state.user);
  const setUser = userStore((state) => state.setUser);

  const {
    connect,
    disconnect,
    loadConversations,
    conversations,
    setActiveConversation,
    showConversationDetails,
  } = useChatStore();

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
      const updateData = {
        firstName: data.firstName,
        lastName: data.lastName,
        userName: data.userName,
        ...(data.currentPassword &&
          data.newPassword && {
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          }),
      };

      const response = await fetch("http://localhost:3000/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const result = await response.json();
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
      } else {
        const errorData = await response.json();
        notifications.show({
          title: "Update Failed",
          message:
            errorData.message || "Profile update failed. Please try again.",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Error during profile update:", error);
      notifications.show({
        title: "Error",
        message: "An error occurred. Please try again.",
        color: "red",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      notifications.show({
        title: "Invalid File",
        message: "Please select an image file.",
        color: "red",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      notifications.show({
        title: "File Too Large",
        message: "Image must be less than 5MB.",
        color: "red",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("parentType", "User");
      formData.append("parentId", user!.id);
      formData.append("usage", "avatar");

      const response = await fetch("http://localhost:3000/api/media/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // Update user with new avatar Media object
        setUser({ ...user!, avatar: result.media });
        notifications.show({
          title: "Success",
          message: "Avatar uploaded successfully!",
          color: "green",
        });
      } else {
        const errorData = await response.json();
        notifications.show({
          title: "Upload Failed",
          message:
            errorData.message || "Avatar upload failed. Please try again.",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      notifications.show({
        title: "Error",
        message: "An error occurred while uploading. Please try again.",
        color: "red",
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

  useEffect(() => {
    // Connect to WebSocket when component mounts
    connect();

    // Load conversations
    loadConversations();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, loadConversations]);

  useEffect(() => {
    // Set the most recent conversation as active on load
    if (
      conversations.length > 0 &&
      !useChatStore.getState().activeConversation
    ) {
      // Use conversation ID for both group and direct chats
      setActiveConversation(conversations[0]._id);
    }
  }, [conversations, setActiveConversation]);

  return (
    <div className="bg-gray-100 h-screen flex items-center relative">
      <Modal opened={isOpen} onClose={close} title="Profile Settings" size="md">
        <div className="relative">
          <LoadingOverlay visible={isUpdating || isUploadingAvatar} />

          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <Avatar
                user={
                  user
                    ? {
                        _id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        userName: user.userName,
                        avatar: user.avatar,
                      }
                    : null
                }
                size="xl"
                className="border-4 border-gray-200"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute bottom-0 right-0 bg-blue-500 cursor-pointer hover:bg-blue-600 disabled:bg-gray-400 text-white p-2 rounded-full shadow-lg transition-colors"
              >
                <CameraIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Click the camera icon to upload a new avatar
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <form
            onSubmit={handleSubmit(handleProfileUpdate)}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <FormField
                name="firstName"
                type="text"
                placeholder="Enter your first name"
                register={register}
                errors={errors}
                containerClassName="bg-gray-100 rounded p-3 flex items-center"
                inputClassName="w-full focus:outline-none bg-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <FormField
                name="lastName"
                type="text"
                placeholder="Enter your last name"
                register={register}
                errors={errors}
                containerClassName="bg-gray-100 rounded p-3 flex items-center"
                inputClassName="w-full focus:outline-none bg-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <FormField
                name="userName"
                type="text"
                placeholder="Enter your username"
                register={register}
                errors={errors}
                containerClassName="bg-gray-100 rounded p-3 flex items-center"
                inputClassName="w-full focus:outline-none bg-transparent"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Change Password
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Leave all password fields blank to keep your current password
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <FormField
                    name="currentPassword"
                    type="password"
                    placeholder="Enter your current password"
                    register={register}
                    errors={errors}
                    containerClassName="bg-gray-100 rounded p-3 flex items-center"
                    inputClassName="w-full focus:outline-none bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <FormField
                    name="newPassword"
                    type="password"
                    placeholder="Enter your new password"
                    register={register}
                    errors={errors}
                    containerClassName="bg-gray-100 rounded p-3 flex items-center"
                    inputClassName="w-full focus:outline-none bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <FormField
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    register={register}
                    errors={errors}
                    containerClassName="bg-gray-100 rounded p-3 flex items-center"
                    inputClassName="w-full focus:outline-none bg-transparent"
                  />
                </div>
              </div>
            </div>

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={close} disabled={isUpdating}>
                Cancel
              </Button>
              <Button type="submit" loading={isUpdating}>
                Update Profile
              </Button>
            </Group>
          </form>
        </div>
      </Modal>

      <Menu position="top">
        <Menu.Target>
          <div className="place-self-end mb-8 ml-4 mr-4 cursor-pointer">
            <Avatar
              user={
                user
                  ? {
                      _id: user.id,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      userName: user.userName,
                      avatar: user.avatar,
                    }
                  : null
              }
              size="lg"
            />
          </div>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<Cog6ToothIcon className="size-6" />}
            onClick={handleModalOpen}
          >
            <span className="cursor-pointer">Profile Settings</span>
          </Menu.Item>
          <Menu.Item
            leftSection={<ArrowRightStartOnRectangleIcon className="size-6" />}
            onClick={logout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Sidebar />
      <MessageWindow />
      {showConversationDetails && <ConversationDetails />}
    </div>
  );
}
