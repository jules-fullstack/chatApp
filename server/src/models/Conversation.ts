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
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      default: null,
    },
    groupAdmin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function() { return this.isGroup; },
    },
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
    readAt: {
      type: Map,
      of: Date,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  },
);

// Static method to find conversation between two users (direct message)
conversationSchema.statics.findBetweenUsers = function (
  userId1: string,
  userId2: string,
) {
  return this.findOne({
    participants: { $all: [userId1, userId2], $size: 2 },
    isGroup: false,
    isActive: true,
  })
    .populate('participants', 'firstName lastName userName')
    .populate('lastMessage');
};

// Static method to create group conversation
conversationSchema.statics.createGroup = function (
  participants: string[],
  groupName: string | null,
  groupAdmin: string,
) {
  return this.create({
    participants,
    isGroup: true,
    groupName,
    groupAdmin,
    isActive: true,
  });
};

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ isGroup: 1 });

const Conversation = model<IConversation>('Conversation', conversationSchema);

export default Conversation;
