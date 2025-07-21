import type { Media } from '../../types';

interface AvatarProps {
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    userName?: string;
    avatar?: Media | string;
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

const defaultAvatarUrl = "https://fullstack-hq-chat-app-bucket.s3.ap-southeast-1.amazonaws.com/images/default-avatars/default-avatar.jpg";

export default function Avatar({ user, size = "md", className = "" }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  
  // Handle both Media object and string URL
  const avatarUrl = user?.avatar 
    ? typeof user.avatar === 'string' 
      ? user.avatar 
      : user.avatar.url
    : defaultAvatarUrl;
    
  const altText = (user?.avatar && typeof user.avatar === 'object' && user.avatar.metadata?.alt) || 
    (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userName || 'User' : 'Default Avatar');
  
  return (
    <img
      src={avatarUrl}
      alt={altText}
      className={`${sizeClass} rounded-full object-cover border border-gray-300 ${className}`}
    />
  );
}