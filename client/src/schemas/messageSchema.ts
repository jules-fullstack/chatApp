import { z } from 'zod';

export const messageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters'),
});

export type MessageFormData = z.infer<typeof messageSchema>;