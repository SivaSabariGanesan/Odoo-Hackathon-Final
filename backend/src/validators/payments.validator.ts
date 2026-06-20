import { z } from "zod";

// ─── Create Payment Order ─────────────────────────────────────────────────────

export const createPaymentOrderSchema = z.object({
  paymentMethodId: z.string().uuid("Invalid payment method ID"),
});

// ─── Cash Payment ─────────────────────────────────────────────────────────────

export const cashPaymentSchema = z.object({
  transactionId:  z.string().uuid("Invalid transaction ID"),
  receivedAmount: z.number().positive("Received amount must be positive"),
});

// ─── Card Payment ─────────────────────────────────────────────────────────────

export const cardPaymentSchema = z.object({
  transactionId:       z.string().uuid("Invalid transaction ID"),
  transactionReference: z.string().min(1, "Transaction reference is required").max(255),
});

// ─── Cashfree Payment ─────────────────────────────────────────────────────────

export const cashfreePaymentSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreatePaymentOrderInput  = z.infer<typeof createPaymentOrderSchema>;
export type CashPaymentInput         = z.infer<typeof cashPaymentSchema>;
export type CardPaymentInput         = z.infer<typeof cardPaymentSchema>;
export type CashfreePaymentInput     = z.infer<typeof cashfreePaymentSchema>;
