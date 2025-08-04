import React from 'react';

interface TypingUser {
  userId: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  conversationId: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  className = '',
}) => {
  if (typingUsers.length === 0) {
    return null;
  }

  const getDisplayName = (user: TypingUser): string => {
    if (user.userName) return user.userName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    return "Someone";
  };

  const getTypingMessage = () => {
    if (typingUsers.length === 1) {
      const user = typingUsers[0];
      const displayName = getDisplayName(user);
      return `${displayName} is typing...`;
    } else if (typingUsers.length === 2) {
      const user1 = typingUsers[0];
      const user2 = typingUsers[1];
      const name1 = getDisplayName(user1);
      const name2 = getDisplayName(user2);
      return `${name1} and ${name2} are typing...`;
    } else {
      return `${typingUsers.length} people are typing...`;
    }
  };

  return (
    <div className={`flex justify-start mb-2 ${className}`}>
      <div className="flex flex-col items-start">
        <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-2xl rounded-bl-md">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1 ml-2">
          {getTypingMessage()}
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;