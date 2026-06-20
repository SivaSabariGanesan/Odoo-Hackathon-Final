import { z } from "zod";

export const configUpdateSchema = z.object({
  isEnabled: z.boolean().optional(),
  onlineOrderingEnabled: z.boolean().optional(),
  qrMenuEnabled: z.boolean().optional(),
  brandName: z.string().max(100).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-character hex color starting with #").optional(),
  bgImageUrl: z.string().url().optional().nullable(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-character hex color starting with #").optional(),
  welcomeMessage: z.string().optional().nullable(),
});

export const configResponseSchema = z.object({
  publicId: z.string().uuid().optional(),
  isEnabled: z.boolean(),
  onlineOrderingEnabled: z.boolean(),
  qrMenuEnabled: z.boolean(),
  brandName: z.string().nullable(),
  logoUrl: z.string().nullable(),
  bgColor: z.string(),
  bgImageUrl: z.string().nullable(),
  accentColor: z.string(),
  welcomeMessage: z.string().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
