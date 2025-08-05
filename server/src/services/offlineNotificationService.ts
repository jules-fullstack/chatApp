import { sendOfflineMessageNotification } from './emailService.js';
import { emailValidationService } from './emailValidationService.js';
import User from '../models/User.js';
import webSocketManager from '../config/websocket.js';

interface PendingNotification {
  userId: string;
  email: string;
  messages: Map<string, { senderName: string; count: number }>;
  timer: NodeJS.Timeout;
  firstMessageTime: Date;
}

class OfflineNotificationService {
  private pendingNotifications: Map<string, PendingNotification> = new Map();
  private readonly OFFLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  private readonly NOTIFICATION_DELAY = 15 * 60 * 1000; // 15 minutes

  async handleNewMessage(recipientId: string, senderId: string, senderName: string, isGroup: boolean = false) {
    // Don't send notifications for group chats
    if (isGroup) {
      return;
    }

    // Check if recipient is online
    if (webSocketManager.isUserOnline(recipientId)) {
      return;
    }

    // Check if recipient is actually offline (last active > 5 minutes ago)
    const recipient = await User.findById(recipientId).select('lastActive email firstName lastName');
    if (!recipient) {
      return;
    }

    const now = new Date();
    const lastActive = new Date(recipient.lastActive);
    const timeSinceLastActive = now.getTime() - lastActive.getTime();

    if (timeSinceLastActive < this.OFFLINE_THRESHOLD) {
      return; // User is not considered offline yet
    }

    // Handle pending notification
    const existingNotification = this.pendingNotifications.get(recipientId);

    if (existingNotification) {
      // Update existing notification
      const conversationKey = `${senderId}`;
      const existingMessage = existingNotification.messages.get(conversationKey);
      
      if (existingMessage) {
        existingMessage.count++;
      } else {
        existingNotification.messages.set(conversationKey, { senderName, count: 1 });
      }
    } else {
      // Create new pending notification
      const timer = setTimeout(() => {
        this.sendPendingNotification(recipientId);
      }, this.NOTIFICATION_DELAY);

      const messages = new Map<string, { senderName: string; count: number }>();
      messages.set(`${senderId}`, { senderName, count: 1 });

      this.pendingNotifications.set(recipientId, {
        userId: recipientId,
        email: recipient.email,
        messages,
        timer,
        firstMessageTime: now,
      });
    }
  }

  private async sendPendingNotification(recipientId: string) {
    const notification = this.pendingNotifications.get(recipientId);
    if (!notification) {
      return;
    }

    try {
      // Check if user came back online during the delay
      if (webSocketManager.isUserOnline(recipientId)) {
        this.cancelNotification(recipientId);
        return;
      }

      // Check if user's last active time is still old enough
      const recipient = await User.findById(recipientId).select('lastActive');
      if (recipient) {
        const now = new Date();
        const lastActive = new Date(recipient.lastActive);
        const timeSinceLastActive = now.getTime() - lastActive.getTime();

        if (timeSinceLastActive < this.OFFLINE_THRESHOLD) {
          this.cancelNotification(recipientId);
          return;
        }
      }

      // Calculate totals
      let totalMessages = 0;
      let firstSenderName = '';
      const conversationCount = notification.messages.size;

      for (const [, messageInfo] of notification.messages) {
        totalMessages += messageInfo.count;
        if (!firstSenderName) {
          firstSenderName = messageInfo.senderName;
        }
      }

      // Validate email before sending notification
      const emailValidation = await emailValidationService.validateEmail(notification.email);
      
      if (!emailValidation.isValid) {
        console.warn(`Skipping offline notification for invalid email ${notification.email}: ${emailValidation.reasons.join(', ')}`);
        return;
      }

      // Send email notification
      await sendOfflineMessageNotification(
        notification.email,
        firstSenderName,
        totalMessages,
        conversationCount
      );

      console.log(`Sent offline notification to ${notification.email}: ${totalMessages} messages from ${conversationCount} conversations`);
    } catch (error) {
      console.error('Error sending offline notification:', error);
    } finally {
      // Clean up
      this.pendingNotifications.delete(recipientId);
    }
  }

  cancelNotification(recipientId: string) {
    const notification = this.pendingNotifications.get(recipientId);
    if (notification) {
      clearTimeout(notification.timer);
      this.pendingNotifications.delete(recipientId);
      console.log(`Cancelled offline notification for user ${recipientId} - user came back online`);
    }
  }

  // Method to be called when user comes online
  onUserOnline(userId: string) {
    this.cancelNotification(userId);
  }

  // Method to clean up expired notifications (optional cleanup)
  cleanup() {
    const now = new Date();
    for (const [userId, notification] of this.pendingNotifications) {
      const timeSinceFirst = now.getTime() - notification.firstMessageTime.getTime();
      // Clean up notifications older than 30 minutes
      if (timeSinceFirst > 30 * 60 * 1000) {
        clearTimeout(notification.timer);
        this.pendingNotifications.delete(userId);
        console.log(`Cleaned up expired notification for user ${userId}`);
      }
    }
  }
}

export default new OfflineNotificationService();