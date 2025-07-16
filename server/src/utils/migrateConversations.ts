import Conversation from '../models/Conversation.js';

export async function migrateConversationsToReadAt() {
  try {
    console.log('Starting migration of conversations to add readAt field...');

    // Find all conversations that don't have readAt field
    const conversations = await Conversation.find({
      $or: [{ readAt: { $exists: false } }, { readAt: null }],
    });

    console.log(`Found ${conversations.length} conversations to migrate`);

    for (const conversation of conversations) {
      // Initialize readAt Map for all participants
      const readAt = new Map();

      conversation.participants.forEach((participantId) => {
        // Set to epoch time (1970) for existing conversations
        // This ensures existing messages won't show as read
        readAt.set(participantId.toString(), new Date(0));
      });

      conversation.readAt = readAt;
      await conversation.save();

      console.log(`Migrated conversation ${conversation._id}`);
    }

    console.log('Migration completed successfully!');
    return { success: true, migratedCount: conversations.length };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error };
  }
}
