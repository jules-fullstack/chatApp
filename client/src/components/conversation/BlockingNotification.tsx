interface BlockingNotificationProps {
  hasBlockedUser: boolean;
  isBlockedByUser: boolean;
}

export function BlockingNotification({
  hasBlockedUser,
  isBlockedByUser,
}: BlockingNotificationProps) {
  if (!hasBlockedUser && !isBlockedByUser) return null;

  return (
    <>
      {hasBlockedUser && (
        <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-orange-800 text-sm font-medium">
            You blocked this person
          </p>
          <p className="text-orange-600 text-xs mt-1">
            You won't receive messages from them.
          </p>
        </div>
      )}

      {isBlockedByUser && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm font-medium">
            You can no longer reply to this conversation
          </p>
          <p className="text-red-600 text-xs mt-1">
            This person has restricted their messages. You won't be able to
            message them.
          </p>
        </div>
      )}
    </>
  );
}
