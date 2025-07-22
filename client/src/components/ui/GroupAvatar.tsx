import Avatar from "./Avatar";
import type { Media } from "../../types";
import { userStore } from "../../store/userStore";

interface GroupAvatarProps {
  participants: {
    _id: string;
    firstName?: string;
    lastName?: string;
    userName?: string;
    avatar?: Media | string;
  }[];
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  groupPhoto?: Media;
}

// Use same size classes as regular Avatar for consistency
const sizeClasses = {
  sm: "w-6 h-6 min-w-6 min-h-6", // size-6
  md: "w-8 h-8 min-w-8 min-h-8", // size-8
  lg: "w-12 h-12 min-w-12 min-h-12", // size-12
  xl: "w-16 h-16 min-w-16 min-h-16", // size-16
};

export default function GroupAvatar({
  participants,
  size = "md",
  className = "",
  groupPhoto,
}: GroupAvatarProps) {
  const { user: currentUser } = userStore();
  
  // If there's a group photo, show it instead of participant avatars
  if (groupPhoto) {
    return (
      <div className={`${sizeClasses[size]} flex-shrink-0 rounded-full overflow-hidden ${className}`}>
        <img 
          src={groupPhoto.url} 
          alt={groupPhoto.metadata?.alt || "Group photo"}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  
  // Check if className contains override dimensions
  const hasOverride = className.includes("!w-") || className.includes("!h-");
  const sizeClass = hasOverride ? "" : sizeClasses[size];

  // For large overrides like !w-28 !h-28, use larger individual avatars
  const isLargeOverride =
    className.includes("!w-28") || className.includes("!w-20");
  let individualSize: "sm" | "md" | "lg" | "xl" =
    size === "xl" ? "lg" : size === "lg" ? "md" : size === "md" ? "sm" : "sm";

  if (isLargeOverride) {
    individualSize = "xl"; // Use larger avatars for big containers
  }

  // Filter out current user and show at most 2 participants, diagonal style
  const filteredParticipants = currentUser 
    ? participants.filter(p => p._id !== currentUser.id)
    : participants;
  const displayParticipants = filteredParticipants.slice(0, 2);

  if (displayParticipants.length === 0) {
    return (
      <div className={`${sizeClass} flex-shrink-0 ${className}`}>
        <Avatar
          user={null}
          size={size}
          className={hasOverride ? className : ""}
        />
      </div>
    );
  }

  if (displayParticipants.length === 1) {
    const participant = displayParticipants[0];
    return (
      <div className={`${sizeClass} flex-shrink-0 ${className}`}>
        <Avatar
          user={participant}
          size={size}
          className={hasOverride ? className : ""}
        />
      </div>
    );
  }

  // For 2+ participants, show diagonal positioning
  return (
    <div className={`relative ${sizeClass} flex-shrink-0 ${className}`}>
      {/* First avatar - positioned to prevent overlap */}
      <div className={`absolute bottom-0 left-0 z-10`}>
        <Avatar
          user={displayParticipants[0]}
          size={individualSize}
          className="border-2 border-white shadow-sm"
        />
      </div>

      {/* Second avatar - positioned to create visual overlap but not text overlap */}
      <div className={`absolute top-0 right-0 z-0`}>
        <Avatar
          user={displayParticipants[1]}
          size={individualSize}
          className="border-2 border-white shadow-sm"
        />
      </div>
    </div>
  );
}
