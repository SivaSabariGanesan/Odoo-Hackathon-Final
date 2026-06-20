import { z } from "zod";

export const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().optional(),
  notes: z.string().optional(),
});
