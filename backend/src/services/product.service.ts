import { eq, isNull, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { products, orderItems, productCategories } from "../db/schema/index.ts";
import { getOrCreateCategoryByName } from "./category.service.ts";

// ─── Input types (mirrored from validators) ───────────────────────────────────

export interface CreateProductInput {
  /** Public UUID of an existing category. Mutually exclusive with categoryName. */
  categoryId?: string;
  /**
   * Inline category creation: if categoryId is omitted, a category with this name
   * is looked up (case-insensitive) or created on the fly.
   */
  categoryName?: string;
  /** Optional hex color used only when creating the category inline. */
  categoryColor?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  uom?: "PIECE" | "CUP" | "GLASS" | "PLATE" | "BOWL" | "KG" | "GRAM" | "LITRE" | "ML";
  taxType?: "NONE" | "INCLUSIVE" | "EXCLUSIVE";
  taxRate?: number;
  isAvailable?: boolean;
  sendToKitchen?: boolean;
  isFeatured?: boolean;
  kdsVisible?: boolean;
  sortOrder?: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;

// Allowed Indian GST tax rates (percent)
export const ALLOWED_TAX_RATES = [0, 5, 12, 18, 28] as const;
export type AllowedTaxRate = (typeof ALLOWED_TAX_RATES)[number];

export function isValidTaxRate(rate: number): rate is AllowedTaxRate {
  return (ALLOWED_TAX_RATES as readonly number[]).includes(rate);
}

export async function listProducts(params: {
  categoryId?: string;
  search?: string;
  isAvailable?: boolean;
  kdsVisible?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { page = 1, pageSize = 50 } = params;
  const offset = (page - 1) * pageSize;

  const rows = await db.query.products.findMany({
    where: (p, { and, eq, isNull, ilike, sql: rawSql }) => {
      const conditions: ReturnType<typeof eq>[] = [isNull(p.deletedAt) as any];
      if (params.isAvailable !== undefined) conditions.push(eq(p.isAvailable, params.isAvailable));
      // kds_visible is added via migration 002 — filter via raw SQL since Drizzle schema
      // doesn't include the column yet
      if (params.kdsVisible !== undefined)
        conditions.push(rawSql`kds_visible = ${params.kdsVisible}` as any);
      if (params.search) conditions.push(ilike(p.name, `%${params.search}%`) as any);
      return and(...conditions);
    },
    with: { category: { columns: { id: true, publicId: true, name: true, color: true } } },
    orderBy: (p) => [p.sortOrder, p.name],
    limit: pageSize,
    offset,
  });

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(isNull(products.deletedAt));

  return { rows, total: countResult[0]?.count ?? 0 };
}

export async function getProductById(publicId: string) {
  return db.query.products.findFirst({
    where: (p, { and, eq, isNull }) => and(eq(p.publicId, publicId), isNull(p.deletedAt)),
    with: { category: true },
  });
}

export async function createProduct(input: CreateProductInput) {
  const taxRate = Number(input.taxRate ?? 0);
  if (!isValidTaxRate(taxRate)) {
    return { error: "INVALID_TAX_RATE" as const };
  }

  // Resolve the internal category ID.
  // If categoryId (public UUID) is provided, look it up.
  // Otherwise fall back to inline creation by categoryName.
  let resolvedCategoryId: bigint;

  if (input.categoryId) {
    const cat = await db.query.productCategories.findFirst({
      where: (c, { eq }) => eq(c.publicId, input.categoryId!),
      columns: { id: true },
    });
    if (!cat) return { error: "CATEGORY_NOT_FOUND" as const };
    resolvedCategoryId = cat.id;
  } else if (input.categoryName) {
    resolvedCategoryId = await getOrCreateCategoryByName(
      input.categoryName,
      input.categoryColor,
    );
  } else {
    return { error: "CATEGORY_REQUIRED" as const };
  }

  const [product] = await db.insert(products).values({
    categoryId: resolvedCategoryId,
    name: input.name,
    description: input.description,
    imageUrl: input.imageUrl,
    price: String(input.price),
    uom: input.uom ?? "PIECE",
    taxType: input.taxType ?? "NONE",
    taxRate: String(taxRate),
    isAvailable: input.isAvailable ?? true,
    sendToKitchen: input.sendToKitchen ?? true,
    isFeatured: input.isFeatured ?? false,
    sortOrder: input.sortOrder ?? 0,
  }).returning();

  // kds_visible is added via migration 002 and is not in the Drizzle schema object yet.
  // Write it via raw SQL when explicitly provided (default TRUE is handled by the DB).
  if (product && input.kdsVisible !== undefined) {
    await db.execute(
      sql`UPDATE products SET kds_visible = ${input.kdsVisible} WHERE id = ${product.id}`,
    );
  }

  return { product };
}

export async function updateProduct(publicId: string, input: UpdateProductInput) {
  const existing = await db.query.products.findFirst({
    where: (p, { and, eq, isNull }) => and(eq(p.publicId, publicId), isNull(p.deletedAt)),
  });
  if (!existing) return { found: false as const };

  if (input.taxRate !== undefined) {
    const taxRate = Number(input.taxRate);
    if (!isValidTaxRate(taxRate)) return { found: true, error: "INVALID_TAX_RATE" as const };
  }

  // Build safe update set — exclude categoryId string (needs bigint conversion)
  const { categoryId: catPublicId, kdsVisible, ...rest } = input as any;
  const updateSet: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (catPublicId) {
    const cat = await db.query.productCategories.findFirst({
      where: (c, { eq }) => eq(c.publicId, catPublicId),
      columns: { id: true },
    });
    if (cat) updateSet.categoryId = cat.id;
  }

  const [updated] = await db.update(products)
    .set(updateSet as any)
    .where(eq(products.publicId, publicId))
    .returning();

  // kds_visible lives in migration 002 column — update via raw SQL when provided
  if (updated && kdsVisible !== undefined) {
    await db.execute(
      sql`UPDATE products SET kds_visible = ${kdsVisible} WHERE id = ${updated.id}`,
    );
  }

  return { found: true, product: updated };
}

export async function deleteProduct(publicId: string) {
  const existing = await db.query.products.findFirst({
    where: (p, { and, eq, isNull }) => and(eq(p.publicId, publicId), isNull(p.deletedAt)),
  });
  if (!existing) return { found: false as const };

  // Block hard delete if referenced by any order_items
  const usedResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orderItems)
    .where(eq(orderItems.productId, existing.id));

  if ((usedResult[0]?.count ?? 0) > 0) {
    return { found: true, blocked: true as const, reason: "Product is referenced by existing orders" };
  }

  await db.update(products)
    .set({ deletedAt: new Date() })
    .where(eq(products.id, existing.id));

  return { found: true, blocked: false as const };
}

export async function archiveProduct(publicId: string) {
  const existing = await db.query.products.findFirst({
    where: (p, { and, eq, isNull }) => and(eq(p.publicId, publicId), isNull(p.deletedAt)),
  });
  if (!existing) return { found: false as const };

  const [updated] = await db.update(products)
    .set({ isAvailable: false, updatedAt: new Date() })
    .where(eq(products.id, existing.id))
    .returning();

  return { found: true, product: updated };
}

export async function bulkArchiveProducts(publicIds: string[]) {
  // Find internal IDs
  const rows = await db.query.products.findMany({
    where: (p, { and, inArray, isNull }) => and(inArray(p.publicId, publicIds), isNull(p.deletedAt)),
    columns: { id: true, publicId: true },
  });

  if (rows.length === 0) return { archived: 0 };

  const ids = rows.map((r) => r.id);
  await db.update(products)
    .set({ isAvailable: false, updatedAt: new Date() })
    .where(inArray(products.id, ids));

  return { archived: rows.length };
}

export async function bulkDeleteProducts(publicIds: string[]) {
  const rows = await db.query.products.findMany({
    where: (p, { and, inArray, isNull }) => and(inArray(p.publicId, publicIds), isNull(p.deletedAt)),
    columns: { id: true, publicId: true },
  });

  if (rows.length === 0) return { deleted: 0, blocked: [] as string[] };

  // Check for order_item references
  const ids = rows.map((r) => r.id);
  const usedRows = await db
    .select({ productId: orderItems.productId })
    .from(orderItems)
    .where(inArray(orderItems.productId, ids));

  const usedIds = new Set(usedRows.map((r) => String(r.productId)));
  const blockedPublicIds = rows.filter((r) => usedIds.has(String(r.id))).map((r) => r.publicId);
  const deletableIds = rows.filter((r) => !usedIds.has(String(r.id))).map((r) => r.id);

  if (deletableIds.length > 0) {
    await db.update(products)
      .set({ deletedAt: new Date() })
      .where(inArray(products.id, deletableIds));
  }

  return { deleted: deletableIds.length, blocked: blockedPublicIds };
}