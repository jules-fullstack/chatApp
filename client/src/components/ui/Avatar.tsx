import type { Media } from "../../types";
import {
  getActiveStatus,
  shouldShowActiveIndicator,
} from "../../utils/activeStatus";
import { AWS_BUCKET } from "../../config";

interface AvatarProps {
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    userName?: string;
    avatar?: Media | string;
    lastActive?: Date | string;
  } | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showActiveStatus?: boolean;
  isConnected?: boolean;
}

const sizeClasses = {
  sm: "w-4 h-4 min-w-4 min-h-4",
  md: "w-8 h-8 min-w-8 min-h-8", // size-8
  lg: "w-12 h-12 min-w-12 min-h-12", // size-12
  xl: "w-16 h-16 min-w-16 min-h-16", // size-16
};

const indicatorSizeClasses = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-3 h-3",
  xl: "w-4 h-4",
};

const defaultAvatarUrl = `https://${AWS_BUCKET}.s3.ap-southeast-1.amazonaws.com/images/default-avatars/default-avatar.jpg`;

export default function Avatar({
  user,
  size = "md",
  className = "",
  showActiveStatus = false,
  isConnected = false,
}: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const indicatorSize = indicatorSizeClasses[size];

  // Handle both Media object and string URL
  const avatarUrl = user?.avatar
    ? typeof user.avatar === "string"
      ? user.avatar
      : user.avatar.url
    : defaultAvatarUrl;

  const altText =
    (user?.avatar &&
      typeof user.avatar === "object" &&
      user.avatar.metadata?.alt) ||
    (user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.userName ||
        "User"
      : "Default Avatar");

  // Calculate active status
  const activeStatus = user
    ? getActiveStatus(user.lastActive || null, isConnected)
    : null;
  const shouldShowIndicator =
    showActiveStatus &&
    activeStatus &&
    shouldShowActiveIndicator(activeStatus.status);

  return (
    <div className="relative inline-block">
      <img
        src={avatarUrl}
        alt={altText}
        className={`${sizeClass} rounded-full object-cover border border-gray-300 ${className}`}
      />
      {shouldShowIndicator && (
        <div
          className={`absolute bottom-0 right-0 ${indicatorSize} bg-green-500 border-2 border-white rounded-full`}
          title="Online"
        />
      )}
    </div>
  );
}
