import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    "Password must contain uppercase, lowercase and a number"
  );

export const signupSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email().toLowerCase().trim(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     passwordSchema,
});

export const createStaffSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email().toLowerCase().trim(),
  password: passwordSchema,
  role:     z.enum(["CASHIER", "KITCHEN"]),
  phone:    z.string().max(20).optional(),
});

export const updateStaffSchema = z.object({
  name:   z.string().min(2).max(100).trim().optional(),
  phone:  z.string().max(20).optional(),
  role:   z.enum(["CASHIER", "KITCHEN"]).optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export type SignupInput         = z.infer<typeof signupSchema>;
export type LoginInput          = z.infer<typeof loginSchema>;
export type RefreshInput        = z.infer<typeof refreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateStaffInput    = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput    = z.infer<typeof updateStaffSchema>;
export type ResetPasswordInput  = z.infer<typeof resetPasswordSchema>;
