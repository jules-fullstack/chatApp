export interface ActiveStatus {
  isOnline: boolean;
  status: 'online' | 'active' | 'recently_active' | 'offline';
  displayText: string;
}

export function getActiveStatus(lastActive: Date | string | null, isConnected: boolean = false): ActiveStatus {
  // If user is currently connected via WebSocket, they're online
  if (isConnected) {
    return {
      isOnline: true,
      status: 'online',
      displayText: 'Online'
    };
  }

  // If no lastActive timestamp, assume offline
  if (!lastActive) {
    return {
      isOnline: false,
      status: 'offline',
      displayText: 'Offline'
    };
  }

  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const diffInMs = now.getTime() - lastActiveDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  // < 1 minute = Online
  if (diffInMinutes < 1) {
    return {
      isOnline: true,
      status: 'online',
      displayText: 'Online'
    };
  }

  // < 5 minutes = Active just now
  if (diffInMinutes < 5) {
    return {
      isOnline: false,
      status: 'active',
      displayText: 'Active just now'
    };
  }

  // < 15 minutes = Active X mins ago (rounded to 5-minute intervals)
  if (diffInMinutes < 15) {
    const roundedMinutes = Math.ceil(diffInMinutes / 5) * 5;
    return {
      isOnline: false,
      status: 'recently_active',
      displayText: `Active ${roundedMinutes} mins ago`
    };
  }

  // < 60 minutes = Active X mins ago
  if (diffInMinutes < 60) {
    return {
      isOnline: false,
      status: 'recently_active',
      displayText: `Active ${diffInMinutes} mins ago`
    };
  }

  // < 24 hours = Active X hours ago
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    const hoursText = diffInHours === 1 ? 'hour' : 'hours';
    return {
      isOnline: false,
      status: 'recently_active',
      displayText: `Active ${diffInHours} ${hoursText} ago`
    };
  }

  // < 7 days = Active X days ago
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    const daysText = diffInDays === 1 ? 'day' : 'days';
    return {
      isOnline: false,
      status: 'recently_active',
      displayText: `Active ${diffInDays} ${daysText} ago`
    };
  }

  // > 7 days = Offline
  return {
    isOnline: false,
    status: 'offline',
    displayText: 'Offline'
  };
}

export function shouldShowActiveIndicator(status: ActiveStatus['status']): boolean {
  return status === 'online';
}