import React from 'react';

interface EmptyStateProps {
  className?: string;
}

export const DefaultView: React.FC<EmptyStateProps> = ({ className = "" }) => (
  <div className={`flex flex-col items-center justify-center h-full text-gray-500 ${className}`}>
    <div className="text-center">
      <div className="mb-4">
        <svg
          className="mx-auto h-24 w-24 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Welcome to Echo
      </h3>
      <p className="text-sm text-gray-500">
        Select a conversation or start a new message
      </p>
    </div>
  </div>
);

export const NewMessageView: React.FC<EmptyStateProps> = ({ className = "" }) => (
  <div className={`flex flex-col items-center justify-center h-full text-gray-500 ${className}`}>
    <div className="text-center">
      <div className="mb-4">
        <svg
          className="mx-auto h-24 w-24 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">New Message</h3>
      <p className="text-sm text-gray-500">
        Search for someone to start a conversation
      </p>
    </div>
  </div>
);

export const NoMessagesView: React.FC<EmptyStateProps> = ({ className = "" }) => (
  <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
    <div className="text-center">
      <div className="mb-4">
        <svg
          className="mx-auto h-16 w-16 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <p className="text-gray-500 text-sm">No messages yet</p>
      <p className="text-gray-400 text-xs mt-1">
        Start the conversation with a message
      </p>
    </div>
  </div>
);

// Composite component that can render all empty states
interface EmptyStatesProps {
  type: 'default' | 'newMessage' | 'noMessages';
  className?: string;
}

export const EmptyStates: React.FC<EmptyStatesProps> = ({ type, className }) => {
  switch (type) {
    case 'default':
      return <DefaultView className={className} />;
    case 'newMessage':
      return <NewMessageView className={className} />;
    case 'noMessages':
      return <NoMessagesView className={className} />;
    default:
      return <DefaultView className={className} />;
  }
};

export default EmptyStates;