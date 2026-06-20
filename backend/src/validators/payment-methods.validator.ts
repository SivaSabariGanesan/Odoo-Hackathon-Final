import { z } from "zod";

export const createPaymentMethodSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: z.enum(["CASH", "CARD", "CASHFREE"]),
  isEnabled: z.boolean().optional().default(true),
});

export const updatePaymentMethodSchema = z.object({
  name:      z.string().min(1).max(100).trim().optional(),
  isEnabled: z.boolean().optional(),
});

export const updateCashfreeConfigSchema = z.object({
  clientId:      z.string().min(1).optional(),
  clientSecret:  z.string().min(1).optional(),
  webhookSecret: z.string().min(1).optional(),
  environment:   z.enum(["SANDBOX", "PRODUCTION"]).optional(),
  isEnabled:     z.boolean().optional(),
});

export type CreatePaymentMethodInput  = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput  = z.infer<typeof updatePaymentMethodSchema>;
export type UpdateCashfreeConfigInput = z.infer<typeof updateCashfreeConfigSchema>;
