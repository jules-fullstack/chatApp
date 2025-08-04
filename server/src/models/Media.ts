import { Schema, model } from 'mongoose';
import { IMedia } from '../types/index.js';

const mediaSchema = new Schema<IMedia>(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    parentType: {
      type: String,
      required: true,
      enum: ['User', 'Message', 'Conversation'],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'parentType',
    },
    usage: {
      type: String,
      required: true,
      enum: ['avatar', 'groupPhoto', 'messageAttachment', 'general'],
    },
    metadata: {
      width: { type: Number },
      height: { type: Number },
      blurhash: { type: String },
      alt: { type: String },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient querying
mediaSchema.index({ parentType: 1, parentId: 1 });
mediaSchema.index({ parentType: 1, parentId: 1, usage: 1 });
mediaSchema.index({ storageKey: 1 });
mediaSchema.index({ isDeleted: 1 });

// Virtual for getting active media
mediaSchema.virtual('isActive').get(function() {
  return !this.isDeleted;
});

export default model<IMedia>('Media', mediaSchema);