import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { userStore } from "../store/userStore";
import { useChatStore } from "../store/chatStore";
import { notifications } from "@mantine/notifications";

export function useLogout(showNotifications = true) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const clearUser = userStore((state) => state.clearUser);
  const resetChatStore = useChatStore.getState?.().resetStore;

  const logout = async () => {
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
        resetChatStore?.();
        navigate({ to: "/login", replace: true });
      } else {
        console.error("Logout failed");
        if (showNotifications) {
          notifications.show({
            title: "Logout Failed",
            message: "Logout failed. Please try again.",
            color: "red",
          });
        } else {
          alert("Logout failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error during logout:", error);
      if (showNotifications) {
        notifications.show({
          title: "Error",
          message: "An error occurred during logout. Please try again.",
          color: "red",
        });
      } else {
        alert("An error occurred during logout.");
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}
