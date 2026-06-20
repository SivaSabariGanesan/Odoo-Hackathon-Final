import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #6366f1)");

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: hexColor.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: hexColor.optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
