import { eq, isNull } from "drizzle-orm";
import { db } from "../db/index.ts";
import { productCategories, products } from "../db/schema/index.ts";
import { emit } from "../utils/events.ts";

// ─── Input types (mirrored from validators) ───────────────────────────────────

export interface CreateCategoryInput {
  name: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function listCategories() {
  return db.query.productCategories.findMany({
    where: eq(productCategories.isActive, true),
    orderBy: [productCategories.sortOrder, productCategories.name],
    with: { products: { where: isNull(products.deletedAt), columns: { id: true, name: true } } },
  });
}

export async function getCategoryById(publicId: string) {
  return db.query.productCategories.findFirst({
    where: eq(productCategories.publicId, publicId),
    with: { products: { where: isNull(products.deletedAt) } },
  });
}

export async function createCategory(input: CreateCategoryInput) {
  const [cat] = await db.insert(productCategories).values({
    name: input.name,
    color: input.color ?? "#6366f1",
    sortOrder: input.sortOrder ?? 0,
  }).returning();
  return cat;
}

export async function updateCategory(publicId: string, input: UpdateCategoryInput) {
  const existing = await db.query.productCategories.findFirst({
    where: eq(productCategories.publicId, publicId),
  });
  if (!existing) return null;

  const colorChanged = input.color && input.color !== existing.color;

  const [updated] = await db.update(productCategories)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(productCategories.publicId, publicId))
    .returning();

  if (colorChanged && updated) {
    emit("category_color_updated", {
      categoryId: updated.publicId,
      color: updated.color,
    });
  }

  return updated;
}

export async function deleteCategory(publicId: string) {
  const existing = await db.query.productCategories.findFirst({
    where: eq(productCategories.publicId, publicId),
    with: { products: { where: isNull(products.deletedAt), columns: { id: true } } },
  });
  if (!existing) return { found: false };

  if (existing.products && existing.products.length > 0) {
    return { found: true, blocked: true, reason: "Category has active products" };
  }

  await db.delete(productCategories).where(eq(productCategories.publicId, publicId));
  return { found: true, blocked: false };
}

/**
 * Used by product creation: resolve a category by name, creating it inline if it
 * doesn't exist. Returns the internal bigint id.
 */
export async function getOrCreateCategoryByName(
  name: string,
  color?: string,
): Promise<bigint> {
  // 1. Try to find an existing category (case-insensitive)
  const existing = await db.query.productCategories.findFirst({
    where: (c, { ilike }) => ilike(c.name, name),
    columns: { id: true },
  });
  if (existing) return existing.id;

  // 2. Not found — insert, but use ON CONFLICT DO NOTHING to handle the
  //    race condition where another request inserts the same name between
  //    our lookup and our insert.
  const [created] = await db.insert(productCategories).values({
    name,
    color: color ?? "#6366f1",
    sortOrder: 0,
  }).onConflictDoNothing().returning({ id: productCategories.id });

  // 3. If insert succeeded, return the new id
  if (created) return created.id;

  // 4. Insert was a no-op (lost the race) — fetch the row that won
  const winner = await db.query.productCategories.findFirst({
    where: (c, { ilike }) => ilike(c.name, name),
    columns: { id: true },
  });
  if (!winner) throw new Error(`Category "${name}" could not be found or created`);
  return winner.id;
}
