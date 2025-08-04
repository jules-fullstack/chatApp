import type { Message } from "../types";

/**
 * Generates a human-readable text description for group events
 * @param message - The message object containing group event data
 * @returns A formatted string describing the group event
 */
export function getGroupEventText(message: Message): string {
  const senderName = `${message.sender.role === "superAdmin" ? "An admin" : message.sender.userName}`;
  const targetName = message.groupEventData?.targetUser
    ? `${message.groupEventData.targetUser.userName}`
    : "";

  switch (message.groupEventType) {
    case "nameChange":
      return `${senderName} changed the chat name to "${message.groupEventData?.newValue}"`;

    case "photoChange":
      return `${senderName} changed the group photo`;

    case "userLeft":
      return `${senderName} left the group`;

    case "userPromoted":
      return `${senderName} promoted ${targetName} to admin`;

    case "userRemoved":
      return `${senderName} removed ${targetName} from the group`;

    case "userAdded":
      return `${senderName} added ${targetName} to the group`;

    case "userJoinedViaInvitation":
      return `${senderName} joined the group via invitation`;

    default:
      return "Group event occurred";
  }
}
