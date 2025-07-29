import { z } from "zod";

// Zod schema for profile update
export const profileUpdateSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name must be less than 50 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name must be less than 50 characters"),
    userName: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be less than 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      ),
    currentPassword: z.string().optional().or(z.literal("")),
    newPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      // If any password field is filled, all must be filled
      const hasCurrentPassword =
        data.currentPassword && data.currentPassword.trim() !== "";
      const hasNewPassword = data.newPassword && data.newPassword.trim() !== "";
      const hasConfirmPassword =
        data.confirmPassword && data.confirmPassword.trim() !== "";

      if (hasCurrentPassword || hasNewPassword || hasConfirmPassword) {
        return hasCurrentPassword && hasNewPassword && hasConfirmPassword;
      }
      return true;
    },
    {
      message: "If changing password, all password fields are required",
      path: ["currentPassword"],
    }
  )
  .refine(
    (data) => {
      // If new password is provided, it must meet length requirements
      if (data.newPassword && data.newPassword.trim() !== "") {
        return data.newPassword.length >= 6 && data.newPassword.length <= 100;
      }
      return true;
    },
    {
      message: "New password must be between 6 and 100 characters",
      path: ["newPassword"],
    }
  )
  .refine(
    (data) => {
      // New password and confirm password must match
      if (data.newPassword && data.confirmPassword) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: "New password and confirm password must match",
      path: ["confirmPassword"],
    }
  );

export type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;