import { useState, useEffect } from "react";
import { useChatStore } from "../store/chatStore";
import { useNavigate } from "@tanstack/react-router";
import { userStore } from "../store/userStore";
import Sidebar from "../components/Sidebar";
import MessageWindow from "../components/MessageWindow";

export default function UserDashboard() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  // const user = userStore((state) => state.user);
  const clearUser = userStore((state) => state.clearUser);

  const {
    connect,
    disconnect,
    loadConversations,
    conversations,
    setActiveConversation,
  } = useChatStore();

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
        alert("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setIsLoggingOut(false);
    }
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
    <div className="bg-gray-100 h-screen flex items-center">
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="cursor-pointer"
      >
        {isLoggingOut ? "Logging out..." : "Logout"}
      </button>
      <Sidebar />
      <MessageWindow />
    </div>
  );
}
