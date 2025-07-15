import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters')
      .trim(),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters')
      .trim(),
    userName: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be less than 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores',
      )
      .transform((val) => val.toLowerCase()),
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

export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
