import { memo } from "react";
import { Menu } from "@mantine/core";
import { ArrowRightStartOnRectangleIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import Avatar from "./Avatar";
import { useLogout } from "../../hooks";
import { transformUserForAvatar } from "../../utils/profileUtils";

import type { Media } from "../../types";

interface UserStoreUser {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  role: "user" | "superAdmin";
  avatar?: Media | string;
}

interface UserMenuProps {
  user: UserStoreUser | null;
  onProfileSettingsClick: () => void;
}

export const UserMenu = memo(({ user, onProfileSettingsClick }: UserMenuProps) => {
  const { logout, isLoggingOut } = useLogout();

  return (
    <Menu position="top">
      <Menu.Target>
        <div className="place-self-end mb-8 ml-4 mr-4 cursor-pointer">
          <Avatar
            user={transformUserForAvatar(user)}
            size="lg"
          />
        </div>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<Cog6ToothIcon className="size-6" />}
          onClick={onProfileSettingsClick}
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
  );
});

UserMenu.displayName = "UserMenu";