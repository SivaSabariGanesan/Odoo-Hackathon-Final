import { z } from "zod";

export const createOrderSchema = z.object({
  tableId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  source: z.enum(["POS", "SELF_ORDER"]).optional(),
  type: z.enum(["DINE_IN", "TAKEAWAY"]).optional(),
  guestName: z.string().max(100).optional(),
});

export const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  notes: z.string().max(500).optional(),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().min(1),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(50),
});

export const sendToKitchenSchema = z.object({}).optional();

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});
