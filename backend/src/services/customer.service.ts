import { eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { customers } from "../db/schema/index.ts";

// ─── Input types (mirrored from validators) ───────────────────────────────────

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
}

export async function listCustomers(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  const rows = await db.query.customers.findMany({
    where: (c, { and, isNull, or, ilike }) => {
      const conditions: any[] = [isNull(c.deletedAt)];
      if (params.search) {
        const s = params.search;
        conditions.push(
          or(
            ilike(c.name, `%${s}%`),
            ilike(c.email as any, `%${s}%`),
            ilike(c.phone as any, `%${s}%`),
          )!,
        );
      }
      return and(...conditions);
    },
    orderBy: (c) => [c.name],
    limit: pageSize,
    offset,
  });

  const countResult = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(customers)
    .where(isNull(customers.deletedAt));

  return { rows, total: countResult[0]?.total ?? 0 };
}

export async function getCustomerById(publicId: string) {
  return db.query.customers.findFirst({
    where: (c, { and, eq, isNull }) => and(eq(c.publicId, publicId), isNull(c.deletedAt)),
  });
}

export async function createCustomer(input: CreateCustomerInput) {
  const [customer] = await db.insert(customers).values({
    name: input.name,
    email: input.email,
    phone: input.phone,
  }).returning();
  return customer;
}

export async function updateCustomer(publicId: string, input: UpdateCustomerInput) {
  const existing = await db.query.customers.findFirst({
    where: (c, { and, eq, isNull }) => and(eq(c.publicId, publicId), isNull(c.deletedAt)),
  });
  if (!existing) return null;

  const [updated] = await db.update(customers)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(customers.publicId, publicId))
    .returning();

  return updated;
}

export async function deleteCustomer(publicId: string) {
  const existing = await db.query.customers.findFirst({
    where: (c, { and, eq, isNull }) => and(eq(c.publicId, publicId), isNull(c.deletedAt)),
  });
  if (!existing) return { found: false };

  await db.update(customers)
    .set({ deletedAt: new Date() })
    .where(eq(customers.publicId, publicId));

  return { found: true };
}
