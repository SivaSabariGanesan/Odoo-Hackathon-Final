import { z } from "zod";

export const createFloorSchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateFloorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type CreateFloorInput = z.infer<typeof createFloorSchema>;
export type UpdateFloorInput = z.infer<typeof updateFloorSchema>;
