import mongoose, { Schema, model } from 'mongoose';
import { IRateLimit } from '../types/index.js';

const rateLimitSchema = new Schema<IRateLimit>(
  {
    key: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['ip', 'user'],
      required: true,
    },
    successfulAttempts: {
      type: Number,
      default: 0,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    totalFailedAttempts: {
      type: Number,
      default: 0,
    },
    windowStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lockoutLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient queries
rateLimitSchema.index({ key: 1, type: 1 }, { unique: true });

// TTL index to automatically clean up expired records (after 24 hours)
rateLimitSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export default (mongoose.models.RateLimit as mongoose.Model<IRateLimit>) || model<IRateLimit>('RateLimit', rateLimitSchema);