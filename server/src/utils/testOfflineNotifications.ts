/**
 * Test utility to demonstrate offline notification system
 * This is for development/testing purposes only
 */

import offlineNotificationService from '../services/offlineNotificationService.js';

interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  lastActive: Date;
}

interface MockMessage {
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
}

class OfflineNotificationTester {
  private mockUsers: Map<string, MockUser> = new Map();
  private onlineUsers: Set<string> = new Set();

  constructor() {
    // Create mock users
    this.mockUsers.set('user1', {
      id: 'user1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      lastActive: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago (offline)
    });

    this.mockUsers.set('user2', {
      id: 'user2',
      email: 'user2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      lastActive: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago (still considered online)
    });

    this.mockUsers.set('user3', {
      id: 'user3',
      email: 'user3@example.com',
      firstName: 'Bob',
      lastName: 'Johnson',
      lastActive: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago (definitely offline)
    });
  }

  // Mock WebSocket manager
  mockIsUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  setUserOnline(userId: string) {
    this.onlineUsers.add(userId);
    console.log(`🟢 User ${userId} came online`);
  }

  setUserOffline(userId: string) {
    this.onlineUsers.delete(userId);
    console.log(`🔴 User ${userId} went offline`);
  }

  async simulateMessage(message: MockMessage) {
    const recipient = this.mockUsers.get(message.recipientId);
    if (!recipient) {
      console.log(`❌ Recipient ${message.recipientId} not found`);
      return;
    }

    const isOnline = this.mockIsUserOnline(message.recipientId);
    const timeSinceLastActive = Date.now() - recipient.lastActive.getTime();
    const isOfflineEnough = timeSinceLastActive >= 5 * 60 * 1000; // 5 minutes

    console.log(`📤 Message from ${message.senderName} to ${recipient.firstName}:`);
    console.log(`   Content: "${message.content}"`);
    console.log(`   Recipient online: ${isOnline}`);
    console.log(`   Last active: ${Math.floor(timeSinceLastActive / 60000)} minutes ago`);
    console.log(`   Offline enough for notification: ${isOfflineEnough}`);

    if (!isOnline && isOfflineEnough) {
      console.log(`⏰ Scheduling offline notification for ${recipient.firstName}...`);
      await offlineNotificationService.handleNewMessage(
        message.recipientId,
        message.senderId,
        message.senderName,
        false
      );
    } else {
      console.log(`✅ No offline notification needed`);
    }
    console.log('---');
  }

  async runDemoScenario() {
    console.log('🚀 Starting Offline Notification Demo\n');

    // Scenario 1: Send message to offline user
    console.log('📋 Scenario 1: Message to offline user (should trigger notification)');
    await this.simulateMessage({
      senderId: 'user2',
      senderName: 'Jane Smith',
      recipientId: 'user1',
      content: 'Hey John, are you available for a call?'
    });

    // Scenario 2: Send another message to same offline user (should update existing notification)
    console.log('📋 Scenario 2: Another message to same offline user');
    await this.simulateMessage({
      senderId: 'user2',
      senderName: 'Jane Smith',
      recipientId: 'user1',
      content: 'Never mind, I found the answer!'
    });

    // Scenario 3: Message from different user to same offline user
    console.log('📋 Scenario 3: Message from different user to same offline user');
    await this.simulateMessage({
      senderId: 'user3',
      senderName: 'Bob Johnson',
      recipientId: 'user1',
      content: 'John, can you review my PR?'
    });

    // Scenario 4: User comes back online (should cancel notification)
    console.log('📋 Scenario 4: User comes back online');
    this.setUserOnline('user1');
    offlineNotificationService.onUserOnline('user1');

    // Scenario 5: Message to recently active user (should not trigger notification)
    console.log('📋 Scenario 5: Message to recently active user');
    await this.simulateMessage({
      senderId: 'user1',
      senderName: 'John Doe',
      recipientId: 'user2',
      content: 'Thanks for the message!'
    });

    console.log('✅ Demo completed! In a real scenario:');
    console.log('   - Offline notifications would be sent after 15 minutes');
    console.log('   - Email notifications would be sent via nodemailer');
    console.log('   - User activity would cancel pending notifications');
  }
}

// Export for manual testing
export default OfflineNotificationTester;

// If run directly, execute demo
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new OfflineNotificationTester();
  tester.runDemoScenario().catch(console.error);
}