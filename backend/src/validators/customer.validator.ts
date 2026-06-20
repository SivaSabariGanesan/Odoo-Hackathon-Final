import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
