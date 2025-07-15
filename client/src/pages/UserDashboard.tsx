import { useState, useEffect } from "react";
import { useChatStore } from "../store/chatStore";
import { useNavigate } from "@tanstack/react-router";
import { userStore } from "../store/userStore";
import {
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
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

// Zod schema for profile update
const profileUpdateSchema = z.object({
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
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters")
    .optional()
    .or(z.literal("")),
});

type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;

export default function UserDashboard() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, { open, close }] = useDisclosure(false);
  const navigate = useNavigate();
  const user = userStore((state) => state.user);
  const clearUser = userStore((state) => state.clearUser);
  const setUser = userStore((state) => state.setUser);

  const {
    connect,
    disconnect,
    loadConversations,
    conversations,
    setActiveConversation,
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
      password: "",
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        clearUser();
        navigate({ to: "/login", replace: true });
      } else {
        console.error("Logout failed");
        notifications.show({
          title: "Logout Failed",
          message: "Logout failed. Please try again.",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Error during logout:", error);
      notifications.show({
        title: "Error",
        message: "An error occurred during logout. Please try again.",
        color: "red",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfileUpdate = async (data: ProfileUpdateForm) => {
    setIsUpdating(true);

    try {
      const updateData = {
        firstName: data.firstName,
        lastName: data.lastName,
        userName: data.userName,
        ...(data.password && { password: data.password }),
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
          password: "",
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

  const handleModalOpen = () => {
    // Reset form with current user data when opening modal
    reset({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      userName: user?.userName || "",
      password: "",
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
      setActiveConversation(conversations[0].participant._id);
    }
  }, [conversations, setActiveConversation]);

  return (
    <div className="bg-gray-100 h-screen flex items-center relative">
      <Modal opened={isOpen} onClose={close} title="Profile Settings" size="md">
        <div className="relative">
          <LoadingOverlay visible={isUpdating} />
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Leave blank to keep current password
              </p>
              <FormField
                name="password"
                type="password"
                placeholder="Enter new password (optional)"
                register={register}
                errors={errors}
                containerClassName="bg-gray-100 rounded p-3 flex items-center"
                inputClassName="w-full focus:outline-none bg-transparent"
              />
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
          <UserCircleIcon className="size-12 place-self-end mb-8 ml-4 cursor-pointer" />
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
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Sidebar />
      <MessageWindow />
    </div>
  );
}
