import { Schema, model } from 'mongoose';
import { IMessage } from '../types/index.js';

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: function() {
        // Content is required only if there are no attachments and it's not a group event
        if (this.messageType === 'groupEvent') return false;
        const attachments = this.attachments || [];
        return attachments.length === 0;
      },
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'groupEvent'],
      default: 'text',
    },
    attachments: {
      type: [Schema.Types.ObjectId],
      ref: 'Media',
      default: [],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    groupEventType: {
      type: String,
      enum: ['nameChange', 'photoChange', 'userLeft', 'userPromoted', 'userRemoved', 'userAdded', 'userJoinedViaInvitation'],
      required: function() {
        return this.messageType === 'groupEvent';
      },
    },
    groupEventData: {
      targetUser: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      oldValue: String,
      newValue: String,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

export default model<IMessage>('Message', messageSchema);
