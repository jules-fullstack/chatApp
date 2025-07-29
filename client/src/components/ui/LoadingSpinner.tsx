import React from 'react';
import { Loader } from '@mantine/core';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  text?: string;
  className?: string;
  variant?: 'default' | 'messages' | 'inline';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 24,
  color = 'blue',
  text,
  className = '',
  variant = 'default',
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'messages':
        return 'flex items-center justify-center py-8';
      case 'inline':
        return 'flex items-center space-x-2';
      default:
        return 'flex items-center justify-center';
    }
  };

  const baseClasses = getVariantClasses();
  const combinedClasses = `${baseClasses} ${className}`;

  return (
    <div className={combinedClasses}>
      <Loader size={size} color={color} />
      {text && (
        <span className="ml-2 text-gray-500">
          {text}
        </span>
      )}
    </div>
  );
};

// Specific variants for common use cases
export const MessagesLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'variant'>> = (props) => (
  <LoadingSpinner {...props} variant="messages" text={props.text || "Loading messages..."} />
);

export const OlderMessagesLoadingSpinner: React.FC<Omit<LoadingSpinnerProps, 'variant' | 'size' | 'color'>> = (props) => (
  <LoadingSpinner 
    {...props} 
    variant="inline" 
    size={16} 
    color="gray"
    text={props.text || "Loading older messages..."} 
  />
);

export default LoadingSpinner;