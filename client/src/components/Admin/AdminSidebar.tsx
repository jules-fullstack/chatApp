import { Tabs } from "@mantine/core";
import {
  UsersIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { useLogout } from "../../hooks/useLogout";

export type AdminTab = "users" | "group-chats";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export default function AdminSidebar({
  activeTab,
  onTabChange,
}: AdminSidebarProps) {
  const { logout, isLoggingOut } = useLogout(false);

  return (
    <div className="bg-blue-300 px-4 py-8 flex flex-col justify-between w-52 h-screen">
      <div>
        <p className="font-semibold mb-6">Admin Dashboard</p>
        <Tabs
          variant="pills"
          value={activeTab}
          onChange={(value) => onTabChange(value as AdminTab)}
          orientation="vertical"
        >
          <Tabs.List className="w-full" grow={false}>
            <Tabs.Tab
              value="users"
              leftSection={<UsersIcon className="w-4 h-4" />}
            >
              Users
            </Tabs.Tab>
            <Tabs.Tab
              value="group-chats"
              leftSection={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
            >
              Group Chats
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </div>
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
