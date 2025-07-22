import { Schema, model } from 'mongoose';

export interface IInvitationToken {
  _id: string;
  email: string;
  token: string;
  conversationId: string;
  invitedBy: string;
  isUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationTokenSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
InvitationTokenSchema.index({ token: 1 });
InvitationTokenSchema.index({ email: 1, conversationId: 1 });
InvitationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const InvitationToken = model<IInvitationToken>('InvitationToken', InvitationTokenSchema);

export default InvitationToken;