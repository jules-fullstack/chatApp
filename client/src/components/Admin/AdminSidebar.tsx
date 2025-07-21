import { useLogout } from "../../hooks/useLogout";

export default function AdminSidebar() {
  const { logout, isLoggingOut } = useLogout(false);

  return (
    <div className="bg-blue-300 flex flex-col justify-between w-50 h-screen">
      Admin Dashboard
      <button
        onClick={logout}
        disabled={isLoggingOut}
        className="cursor-pointer"
      >
        {isLoggingOut ? "Logging out..." : "Logout"}
      </button>
    </div>
  );
}
