import mongoose, { Schema, model } from 'mongoose';
import { IConversation } from '../types/index.js';

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.statics.findBetweenUsers = function (
  userId1: string,
  userId2: string,
) {
  return this.findOne({
    participants: { $all: [userId1, userId2] },
    isActive: true,
  });
};

// Ensure participants array has exactly 2 users for direct messaging
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Static method to find conversation between two users
conversationSchema.statics.findBetweenUsers = function (
  userId1: string,
  userId2: string,
) {
  return this.findOne({
    participants: { $all: [userId1, userId2], $size: 2 },
  })
    .populate('participants', 'firstName lastName userName')
    .populate('lastMessage');
};

const Conversation = model<IConversation>('Conversation', conversationSchema);

export default Conversation;
