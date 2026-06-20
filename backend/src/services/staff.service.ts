import { eq, isNull, and, sql, inArray, or, ilike } from "drizzle-orm";
import { db } from "../db/index.ts";
import { staffAccounts, posSessions, orders } from "../db/schema/index.ts";
import type { UpdateStaffInput } from "../validators/staff.validator.ts";
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = Number(process.env["BCRYPT_ROUNDS"] ?? 12);

export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "ADMIN" | "CASHIER" | "MANAGER";
  pin?: string;
  avatarUrl?: string;
}

export async function createStaff(input: CreateStaffInput) {
  // Check for duplicate email
  const existing = await db.query.staffAccounts.findFirst({
    where: (s, { eq }) => eq(s.email, input.email),
    columns: { id: true },
  });
  if (existing) return { error: "EMAIL_ALREADY_EXISTS" as const };

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const [staff] = await db.insert(staffAccounts).values({
    name: input.name,
    email: input.email,
    passwordHash,
    phone: input.phone,
    role: input.role ?? "CASHIER",
    status: "ACTIVE",
    pin: input.pin,
    avatarUrl: input.avatarUrl,
  }).returning({
    id: staffAccounts.id,
    publicId: staffAccounts.publicId,
    name: staffAccounts.name,
    email: staffAccounts.email,
    phone: staffAccounts.phone,
    role: staffAccounts.role,
    status: staffAccounts.status,
    avatarUrl: staffAccounts.avatarUrl,
    createdAt: staffAccounts.createdAt,
    updatedAt: staffAccounts.updatedAt,
  });

  return { staff };
}

export async function listStaff(params: {
  role?: "ADMIN" | "CASHIER" | "MANAGER";
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  const rows = await db.query.staffAccounts.findMany({
    where: (s, { and, eq, isNull, ilike, or }) => {
      const conditions: any[] = [isNull(s.deletedAt)];
      if (params.role) conditions.push(eq(s.role, params.role));
      if (params.status) conditions.push(eq(s.status, params.status));
      if (params.search) {
        conditions.push(
          or(ilike(s.name, `%${params.search}%`), ilike(s.email, `%${params.search}%`)),
        );
      }
      return and(...conditions);
    },
    columns: {
      passwordHash: false,
      resetToken: false,
      resetTokenExpiresAt: false,
    },
    orderBy: (s) => [s.name],
    limit: pageSize,
    offset,
  });

  const countResult = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(staffAccounts)
    .where(isNull(staffAccounts.deletedAt));

  return { rows, total: countResult[0]?.total ?? 0 };
}

export async function getStaffById(publicId: string) {
  return db.query.staffAccounts.findFirst({
    where: (s, { and, eq, isNull }) => and(eq(s.publicId, publicId), isNull(s.deletedAt)),
    columns: { passwordHash: false, resetToken: false, resetTokenExpiresAt: false },
  });
}

export async function updateStaff(publicId: string, input: UpdateStaffInput) {
  const existing = await db.query.staffAccounts.findFirst({
    where: (s, { and, eq, isNull }) => and(eq(s.publicId, publicId), isNull(s.deletedAt)),
  });
  if (!existing) return { found: false as const };

  const { password, ...rest } = input as any;
  const [updated] = await db.update(staffAccounts)
    .set({ ...rest, updatedAt: new Date() })
    .where(eq(staffAccounts.publicId, publicId))
    .returning({
      id: staffAccounts.id,
      publicId: staffAccounts.publicId,
      name: staffAccounts.name,
      email: staffAccounts.email,
      phone: staffAccounts.phone,
      role: staffAccounts.role,
      status: staffAccounts.status,
      updatedAt: staffAccounts.updatedAt,
    });

  return { found: true, staff: updated };
}

export async function changePassword(publicId: string, newPassword: string) {
  const existing = await db.query.staffAccounts.findFirst({
    where: (s, { and, eq, isNull }) => and(eq(s.publicId, publicId), isNull(s.deletedAt)),
  });
  if (!existing) return { found: false as const };

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(staffAccounts)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(staffAccounts.publicId, publicId));

  return { found: true };
}

export async function archiveStaff(publicId: string) {
  const existing = await db.query.staffAccounts.findFirst({
    where: (s, { and, eq, isNull }) => and(eq(s.publicId, publicId), isNull(s.deletedAt)),
  });
  if (!existing) return { found: false as const };

  const [updated] = await db.update(staffAccounts)
    .set({ status: "ARCHIVED", archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(staffAccounts.publicId, publicId))
    .returning({ publicId: staffAccounts.publicId, status: staffAccounts.status });

  return { found: true, staff: updated };
}

export async function deleteStaff(publicId: string) {
  const existing = await db.query.staffAccounts.findFirst({
    where: (s, { and, eq, isNull }) => and(eq(s.publicId, publicId), isNull(s.deletedAt)),
  });
  if (!existing) return { found: false as const };

  // Block delete if referenced as session opener or order creator
  const sessionRes = await db
    .select({ sessionCount: sql<number>`count(*)::int` })
    .from(posSessions)
    .where(eq(posSessions.openedById, existing.id));

  const orderRes = await db
    .select({ orderCount: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.staffId, existing.id));

  if ((sessionRes[0]?.sessionCount ?? 0) > 0 || (orderRes[0]?.orderCount ?? 0) > 0) {
    return {
      found: true,
      blocked: true as const,
      reason: "Staff member is referenced by sessions or orders. Archive instead.",
    };
  }

  await db.update(staffAccounts)
    .set({ deletedAt: new Date() })
    .where(eq(staffAccounts.publicId, publicId));

  return { found: true, blocked: false as const };
}
