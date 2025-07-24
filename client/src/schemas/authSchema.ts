import { z } from "zod";

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name must be between 2 and 50 characters")
      .max(50, "First name must be between 2 and 50 characters")
      .regex(/^[a-zA-Z\s]+$/, "First name can only contain letters and spaces"),

    lastName: z
      .string()
      .min(2, "Last name must be between 2 and 50 characters")
      .max(50, "Last name must be between 2 and 50 characters")
      .regex(/^[a-zA-Z\s]+$/, "Last name can only contain letters and spaces"),

    userName: z
      .string()
      .min(3, "Username must be between 3 and 30 characters")
      .max(30, "Username must be between 3 and 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),

    email: z.string().email("Please provide a valid email address"),

    password: z.string().min(8, "Password must be at least 8 characters long"),

    confirmPassword: z.string().min(1, "Please confirm your password"),

    invitationToken: z
      .string()
      .min(32, "Invalid invitation token format")
      .max(128, "Invalid invitation token format")
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Your passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
