import { z } from "zod";

const stateEnum = z.enum([
  "IDLE",
  "ORDER_VIEW",
  "PAYMENT_VIEW",
  "COMPLETION_VIEW",
]);

export const displayStateUpdateSchema = z.object({
  state: stateEnum,
  orderId: z.number().int().optional(),
  upiString: z.string().optional(),
  message: z.string().optional(),
});

export const displayStateResponseSchema = z.object({
  terminalId: z.string().uuid(),
  displayState: stateEnum,
  activeOrderId: z.number().nullable(),
  payload: z.record(z.any()).nullable(),
});
