import { z } from 'zod';

// Base reusable schemas
const emailSchema = z
  .string()
  .email('Invalid email format')
  .transform((val) => val.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long');

const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')
  .trim();

const userNameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username can only contain letters, numbers, and underscores',
  )
  .transform((val) => val.toLowerCase());

const mongoIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format');

const otpSchema = z
  .string()
  .length(6, 'OTP must be exactly 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers');

// Auth schemas
export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  userName: userNameSchema,
  email: emailSchema,
  password: passwordSchema,
  invitationToken: z
    .string()
    .min(32, 'Invalid invitation token format')
    .max(128, 'Invalid invitation token format')
    .optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const otpVerificationSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export const emailOnlySchema = z.object({
  email: emailSchema,
});

export const pendingSessionSchema = z.object({
  email: emailSchema,
});

// User profile schema
export const updateProfileSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    userName: userNameSchema,
    currentPassword: z.string().optional().or(z.literal('')),
    newPassword: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      // If currentPassword is provided, newPassword must also be provided
      if (data.currentPassword && data.currentPassword.trim() !== '') {
        return data.newPassword && data.newPassword.trim() !== '';
      }
      return true;
    },
    {
      message: 'New password is required when current password is provided',
      path: ['newPassword'],
    },
  )
  .refine(
    (data) => {
      // If newPassword is provided, it must meet length requirements
      if (data.newPassword && data.newPassword.trim() !== '') {
        return data.newPassword.length >= 6 && data.newPassword.length <= 100;
      }
      return true;
    },
    {
      message: 'New password must be between 6 and 100 characters',
      path: ['newPassword'],
    },
  );

// Message schemas
export const messageContentSchema = z.object({
  content: z
    .string()
    .max(2000, 'Message content must be no more than 2000 characters')
    .optional(),
  messageType: z
    .enum(['text', 'image'])
    .optional(),
  recipientIds: z
    .union([
      z.string(),
      z.array(z.string()),
    ])
    .optional(),
  conversationId: mongoIdSchema.optional(),
  attachmentIds: z
    .array(mongoIdSchema)
    .optional(),
  images: z.array(z.any()).optional(), // For uploaded images
  groupName: z
    .string()
    .max(100, 'Group name must be no more than 100 characters')
    .trim()
    .optional(),
});

// Invitation schemas
export const invitationEmailsSchema = z.object({
  emails: z
    .array(emailSchema)
    .min(1, 'Please provide at least one email address')
    .max(50, 'Cannot invite more than 50 users at once'),
});

export const invitationTokenSchema = z.object({
  invitationToken: z.string().min(32).max(128),
  email: emailSchema,
});

export const invitationQuerySchema = z.object({
  token: z.string().min(32, 'Invalid invitation token'),
});

// Media validation schemas
export const mediaUploadSchema = z.object({
  parentType: z.enum(['User', 'Message', 'Conversation']),
  parentId: mongoIdSchema,
  usage: z.enum(['avatar', 'groupPhoto', 'messageAttachment', 'general']),
});

export const mediaParamsSchema = z.object({
  parentType: z.enum(['User', 'Message', 'Conversation']),
  parentId: mongoIdSchema,
});

export const mediaIdSchema = z.object({
  mediaId: mongoIdSchema,
});

// Group validation schemas
export const userIdsSchema = z.object({
  userIds: z
    .array(mongoIdSchema)
    .min(1, 'At least one user ID is required')
    .max(100, 'Cannot add more than 100 users at once'),
});

export const singleUserIdSchema = z.object({
  newAdminId: mongoIdSchema,
});

export const groupNameSchema = z.object({
  groupName: z
    .string()
    .max(100, 'Group name must be no more than 100 characters')
    .trim()
    .optional()
    .or(z.literal('')),
});

// User search schema
export const userSearchQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Search query must be at least 1 character long')
    .max(100, 'Search query must be no more than 100 characters')
    .trim(),
});

// Type exports
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type OTPVerificationData = z.infer<typeof otpVerificationSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type MessageContentData = z.infer<typeof messageContentSchema>;
export type InvitationEmailsData = z.infer<typeof invitationEmailsSchema>;
export type MediaUploadData = z.infer<typeof mediaUploadSchema>;
export type UserIdsData = z.infer<typeof userIdsSchema>;
export type UserSearchQueryData = z.infer<typeof userSearchQuerySchema>;