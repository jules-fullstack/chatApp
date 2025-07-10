import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { userStore } from "../store/userStore";
import ChatsMenu from "../components/ChatsMenu";
import MessageWindow from "../components/MessageWindow";

export default function UserDashboard() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  // const user = userStore((state) => state.user);
  const clearUser = userStore((state) => state.clearUser);

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

  return (
    <div className="bg-gray-100 h-screen flex items-center">
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="cursor-pointer"
      >
        {isLoggingOut ? "Logging out..." : "Logout"}
      </button>
      <ChatsMenu />
      <MessageWindow />
    </div>
  );
}
