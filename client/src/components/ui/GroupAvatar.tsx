import { UserCircleIcon } from "@heroicons/react/24/outline";

interface GroupAvatarProps {
  participants: {
    _id: string;
    firstName?: string;
    lastName?: string;
    userName?: string;
    avatar?: string;
  }[];
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6", // size-6 
  md: "w-8 h-8", // size-8
  lg: "w-12 h-12", // size-12
  xl: "w-16 h-16", // size-16
};

const offsetClasses = {
  sm: "ml-[-8px]", // -ml-2
  md: "ml-[-12px]", // -ml-3
  lg: "ml-[-16px]", // -ml-4
  xl: "ml-[-20px]", // -ml-5
};

export default function GroupAvatar({ participants, size = "md", className = "" }: GroupAvatarProps) {
  const sizeClass = sizeClasses[size];
  const offsetClass = offsetClasses[size];
  
  // Show at most 2 participants, overlapping style like Facebook Messenger
  const displayParticipants = participants.slice(0, 2);
  
  if (displayParticipants.length === 0) {
    return (
      <div className={`${sizeClass} ${className}`}>
        <UserCircleIcon className={`${sizeClass} text-gray-400`} />
      </div>
    );
  }
  
  if (displayParticipants.length === 1) {
    const participant = displayParticipants[0];
    return (
      <div className={`${sizeClass} ${className}`}>
        {participant.avatar ? (
          <img
            src={participant.avatar}
            alt={`${participant.firstName || ''} ${participant.lastName || ''}`}
            className={`${sizeClass} rounded-full object-cover border border-gray-300`}
          />
        ) : (
          <UserCircleIcon className={`${sizeClass} text-gray-400`} />
        )}
      </div>
    );
  }
  
  // For 2+ participants, show overlapping avatars
  return (
    <div className={`relative ${sizeClass} ${className}`}>
      {displayParticipants.map((participant, index) => (
        <div
          key={participant._id}
          className={`absolute ${sizeClass} ${index > 0 ? offsetClass : ''}`}
          style={{ zIndex: displayParticipants.length - index }}
        >
          {participant.avatar ? (
            <img
              src={participant.avatar}
              alt={`${participant.firstName || ''} ${participant.lastName || ''}`}
              className={`${sizeClass} rounded-full object-cover border-2 border-white`}
            />
          ) : (
            <UserCircleIcon className={`${sizeClass} text-gray-400 bg-white rounded-full border-2 border-white`} />
          )}
        </div>
      ))}
    </div>
  );
}