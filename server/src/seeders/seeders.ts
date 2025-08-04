import mongoose from 'mongoose';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import type { IUser, IMessage, IConversation } from '../types/index.js';

// Helper function to generate random names
const firstNames = [
  'Alex',
  'Jordan',
  'Taylor',
  'Morgan',
  'Casey',
  'Riley',
  'Avery',
  'Quinn',
  'Blake',
  'Cameron',
  'Dana',
  'Drew',
  'Emery',
  'Finley',
  'Harper',
  'Jamie',
  'Kendall',
  'Logan',
  'Parker',
  'Reese',
  'Sage',
  'Skyler',
  'Tatum',
  'River',
  'Phoenix',
  'Rowan',
  'Hayden',
  'Peyton',
  'Charlie',
  'Devon',
  'Emerson',
  'Gray',
  'Indigo',
  'Jules',
  'Kai',
  'Lane',
  'Marlowe',
  'Nova',
  'Onyx',
  'Presley',
  'Raven',
  'Shiloh',
  'True',
  'Vale',
  'Winter',
  'Zion',
  'Ari',
  'Bryce',
  'Cedar',
];

const lastNames = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
];

const messageContents = [
  'Hey there! How are you doing?',
  'Just wanted to check in and see how things are going.',
  "Hope you're having a great day!",
  'Did you see the latest news?',
  'I was thinking about our conversation yesterday.',
  'Thanks for helping me out with that project.',
  'Looking forward to catching up soon!',
  'That sounds like a great idea.',
  'I completely agree with you on that.',
  'Let me know if you need any help.',
  'Have you tried the new restaurant downtown?',
  'The weather has been amazing lately.',
  "I'm excited about the upcoming weekend.",
  'That movie was incredible!',
  "I can't believe how fast time flies.",
  'Your presentation was really impressive.',
  'Thanks for the recommendation!',
  "I'll get back to you on that soon.",
  'Hope everything is going well.',
  'It was great meeting you today.',
  "I'm looking forward to our next meeting.",
  "That's a really interesting perspective.",
  'Thanks for sharing that with me.',
  "I'll keep that in mind for next time.",
  'Hope you have a wonderful evening!',
  'Just finished reading that book you suggested.',
  'The concert last night was amazing!',
  "I'm planning a trip next month.",
  'That recipe turned out delicious!',
  'Thanks for being such a great friend.',
];

const groupNames = [
  'Study Group',
  'Weekend Warriors',
  'Coffee Lovers',
  'Book Club',
  'Fitness Buddies',
  'Travel Enthusiasts',
  'Foodies United',
  'Tech Talk',
  'Movie Night Crew',
  'Photography Club',
];

// Utility functions
export class SeederUtils {
  static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  static getRandomElements<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  static generateRandomDate(start: Date, end: Date): Date {
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    );
  }

  static async createDefaultAdmin(): Promise<void> {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Default admin already exists, skipping creation.');
      return;
    }

    const admin = new User({
      firstName: 'Super',
      lastName: 'Admin',
      userName: 'superadmin',
      email: adminEmail,
      password: adminPassword,
      role: 'superAdmin',
      isEmailVerified: true,
    });

    await admin.save();
    console.log('Default admin created successfully.');
  }

  static async createDummyUsers(
    count: number,
  ): Promise<mongoose.Types.ObjectId[]> {
    const users: Partial<IUser>[] = [];

    for (let i = 0; i < count; i++) {
      const firstName = this.getRandomElement(firstNames);
      const lastName = this.getRandomElement(lastNames);
      const userName = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`;
      const email = `${userName}@example.com`;

      const user = {
        firstName,
        lastName,
        userName,
        email,
        password: 'Password123!',
        role: 'user' as const,
        isEmailVerified: true,
        lastActive: this.generateRandomDate(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          new Date(),
        ),
      };

      users.push(user);
    }

    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} dummy users.`);

    return createdUsers.map((user) => user._id as mongoose.Types.ObjectId);
  }

  static async createDirectConversations(
    userIds: mongoose.Types.ObjectId[],
    count: number,
  ): Promise<mongoose.Types.ObjectId[]> {
    const conversations: Partial<IConversation>[] = [];
    const usedPairs = new Set<string>();

    for (let i = 0; i < count; i++) {
      let user1Id: mongoose.Types.ObjectId;
      let user2Id: mongoose.Types.ObjectId;
      let pairKey: string;

      // Ensure unique pairs
      do {
        user1Id = this.getRandomElement(userIds);
        user2Id = this.getRandomElement(userIds.filter((id) => id !== user1Id));
        pairKey = [user1Id.toString(), user2Id.toString()].sort().join('-');
      } while (usedPairs.has(pairKey));

      usedPairs.add(pairKey);

      const conversation = {
        participants: [user1Id, user2Id],
        isGroup: false,
        lastMessageAt: this.generateRandomDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          new Date(),
        ),
        unreadCount: new Map(),
        readAt: new Map(),
      };

      conversations.push(conversation);
    }

    const createdConversations = await Conversation.insertMany(conversations);
    console.log(`Created ${createdConversations.length} direct conversations.`);

    return createdConversations.map(
      (conv) => conv._id as mongoose.Types.ObjectId,
    );
  }

  static async createGroupConversations(
    userIds: mongoose.Types.ObjectId[],
    count: number,
  ): Promise<mongoose.Types.ObjectId[]> {
    const conversations: Partial<IConversation>[] = [];

    for (let i = 0; i < count; i++) {
      const participantCount = Math.floor(Math.random() * 8) + 3; // 3-10 participants
      const participants = this.getRandomElements(userIds, participantCount);
      const groupAdmin = this.getRandomElement(participants);
      const groupName = this.getRandomElement(groupNames);

      const conversation = {
        participants,
        isGroup: true,
        groupName: `${groupName} ${i + 1}`,
        groupAdmin,
        lastMessageAt: this.generateRandomDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          new Date(),
        ),
        unreadCount: new Map(),
        readAt: new Map(),
      };

      conversations.push(conversation);
    }

    const createdConversations = await Conversation.insertMany(conversations);
    console.log(`Created ${createdConversations.length} group conversations.`);

    return createdConversations.map(
      (conv) => conv._id as mongoose.Types.ObjectId,
    );
  }

  static async createMessages(
    conversationIds: mongoose.Types.ObjectId[],
    userIds: mongoose.Types.ObjectId[],
    totalCount: number,
  ): Promise<mongoose.Types.ObjectId[]> {
    const messages: Partial<IMessage>[] = [];

    // Get conversation details to ensure proper sender assignment
    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
    });

    for (let i = 0; i < totalCount; i++) {
      const conversation = this.getRandomElement(conversations);
      const sender = this.getRandomElement(
        conversation.participants as mongoose.Types.ObjectId[],
      );
      const content = this.getRandomElement(messageContents);

      const message = {
        conversation: conversation._id,
        sender,
        content,
        messageType: 'text' as const,
        createdAt: this.generateRandomDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          new Date(),
        ),
      };

      messages.push(message);
    }

    // Sort messages by creation date
    messages.sort(
      (a, b) =>
        (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime(),
    );

    const createdMessages = await Message.insertMany(messages);
    console.log(`Created ${createdMessages.length} messages.`);

    // Update conversations with last message info
    await this.updateConversationLastMessages(conversationIds);

    return createdMessages.map((msg) => msg._id as mongoose.Types.ObjectId);
  }

  static async updateConversationLastMessages(
    conversationIds: mongoose.Types.ObjectId[],
  ): Promise<void> {
    for (const conversationId of conversationIds) {
      const lastMessage = await Message.findOne({
        conversation: conversationId,
      }).sort({ createdAt: -1 });

      if (lastMessage) {
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: lastMessage._id,
          lastMessageAt: lastMessage.createdAt,
        });
      }
    }
    console.log('Updated conversation last message references.');
  }

  static async clearExistingData(): Promise<void> {
    await Promise.all([
      Message.deleteMany({}),
      Conversation.deleteMany({}),
      User.deleteMany({ role: 'user' }), // Keep existing superAdmins
    ]);
    console.log('Cleared existing dummy data.');
  }
}
