import { format, isToday, isThisWeek, differenceInMinutes } from "date-fns";

export const shouldShowTimeSeparator = (
  currentMessageTime: string,
  previousMessageTime: string | null
): boolean => {
  if (!previousMessageTime) return true;
  
  const current = new Date(currentMessageTime);
  const previous = new Date(previousMessageTime);
  
  // Show separator if more than 10 minutes between messages
  return differenceInMinutes(current, previous) >= 10;
};

export const formatTimeSeparator = (timestamp: string): string => {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    // Same day: show military time (24:00 format)
    return format(date, "HH:mm");
  } else if (isThisWeek(date)) {
    // Same week: show day and time in AM/PM format (Mon 5:00 PM)
    return format(date, "eee h:mm a");
  } else {
    // Earlier than this week: show full date (Jul 7, 2025, 1:00 PM)
    return format(date, "MMM d, yyyy, h:mm a");
  }
};