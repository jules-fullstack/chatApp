import { UserCircleIcon } from "@heroicons/react/24/outline";

interface AvatarProps {
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    userName?: string;
    avatar?: string;
  } | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6", // size-6
  md: "w-8 h-8", // size-8
  lg: "w-12 h-12", // size-12
  xl: "w-16 h-16", // size-16
};

export default function Avatar({ user, size = "md", className = "" }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={`${user.firstName || ''} ${user.lastName || ''}`}
        className={`${sizeClass} rounded-full object-cover border border-gray-300 ${className}`}
      />
    );
  }

  return (
    <UserCircleIcon className={`${sizeClass} text-gray-400 ${className}`} />
  );
}