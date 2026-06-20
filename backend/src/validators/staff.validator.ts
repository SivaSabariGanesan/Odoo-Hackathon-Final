import { z } from "zod";

export const updateStaffSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
  avatarUrl: z.string().url().optional(),
  role: z.enum(["ADMIN", "CASHIER", "KITCHEN"]).optional(),
  pin: z.string().length(6).regex(/^\d{6}$/, "PIN must be exactly 6 digits").optional(),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
