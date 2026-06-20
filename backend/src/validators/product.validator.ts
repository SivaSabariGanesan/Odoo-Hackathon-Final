import { z } from "zod";

const ALLOWED_TAX_RATES = [0, 5, 12, 18, 28];

const uomValues = ["PIECE", "CUP", "GLASS", "PLATE", "BOWL", "KG", "GRAM", "LITRE", "ML"] as const;
const taxTypeValues = ["NONE", "INCLUSIVE", "EXCLUSIVE"] as const;

export const createProductSchema = z.object({
  categoryId: z.string().min(1, "categoryId is required"),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().min(0),
  uom: z.enum(uomValues).optional(),
  taxType: z.enum(taxTypeValues).optional(),
  taxRate: z
    .number()
    .refine((v) => ALLOWED_TAX_RATES.includes(v), {
      message: `Tax rate must be one of: ${ALLOWED_TAX_RATES.join(", ")}`,
    })
    .optional(),
  isAvailable: z.boolean().optional(),
  sendToKitchen: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  kdsVisible: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const bulkProductSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
