import { z } from "zod";

export const createTableSchema = z.object({
  floorId: z.string().uuid("floorId must be a valid UUID"),
  tableNumber: z.string().min(1).max(20),
  seats: z.number().int().min(1).optional(),
  posX: z.number().int().optional(),
  posY: z.number().int().optional(),
});

export const updateTableSchema = z.object({
  tableNumber: z.string().min(1).max(20).optional(),
  seats: z.number().int().min(1).optional(),
  posX: z.number().int().optional(),
  posY: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
