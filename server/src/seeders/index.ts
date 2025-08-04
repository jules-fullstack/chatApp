import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { SeederUtils } from './seeders.js';
import connectDB from '../config/database.js';

async function runSeeders() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    console.log('📡 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected successfully');

    // Clear existing data (except superAdmins)
    console.log('🧹 Clearing existing dummy data...');
    await SeederUtils.clearExistingData();

    // Create default admin if it doesn't exist
    console.log('👤 Creating default admin...');
    await SeederUtils.createDefaultAdmin();

    // Create 50 dummy users
    console.log('👥 Creating 50 dummy users...');
    const userIds = await SeederUtils.createDummyUsers(50);

    // Create 10 direct conversations
    console.log('💬 Creating 10 direct conversations...');
    const directConversationIds = await SeederUtils.createDirectConversations(userIds, 10);

    // Create 10 group conversations
    console.log('👥 Creating 10 group conversations...');
    const groupConversationIds = await SeederUtils.createGroupConversations(userIds, 10);

    // Combine all conversation IDs
    const allConversationIds = [...directConversationIds, ...groupConversationIds];

    // Create 200 messages across all conversations
    console.log('📝 Creating 200 messages...');
    await SeederUtils.createMessages(allConversationIds, userIds, 200);

    console.log('✅ Database seeding completed successfully!');
    console.log(`
📊 Summary:
- Default admin: 1 (admin@admin.com)
- Dummy users: 50
- Direct conversations: 10
- Group conversations: 10
- Total messages: 200
    `);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run seeders immediately
runSeeders();

export { runSeeders };