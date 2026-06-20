import { eq, isNull, and, ne } from "drizzle-orm";
import { db } from "../db/index.ts";
import { staffAccounts, refreshTokens } from "../db/schema/index.ts";
import { hashPassword } from "../utils/password.ts";
import type { CreateStaffInput, UpdateStaffInput } from "../validators/auth.validator.ts";

const safeFields = {
  id:          staffAccounts.publicId,
  name:        staffAccounts.name,
  email:       staffAccounts.email,
  phone:       staffAccounts.phone,
  role:        staffAccounts.role,
  status:      staffAccounts.status,
  avatarUrl:   staffAccounts.avatarUrl,
  lastLoginAt: staffAccounts.lastLoginAt,
  createdAt:   staffAccounts.createdAt,
  updatedAt:   staffAccounts.updatedAt,
};

export async function listStaff() {
  return db
    .select(safeFields)
    .from(staffAccounts)
    .where(isNull(staffAccounts.deletedAt))
    .orderBy(staffAccounts.createdAt);
}

export async function getStaffById(publicId: string) {
  const [user] = await db
    .select(safeFields)
    .from(staffAccounts)
    .where(and(eq(staffAccounts.publicId, publicId), isNull(staffAccounts.deletedAt)))
    .limit(1);

  if (!user) throw Object.assign(new Error("Staff not found"), { status: 404 });
  return user;
}

export async function createStaff(input: CreateStaffInput) {
  const existing = await db
    .select({ id: staffAccounts.id })
    .from(staffAccounts)
    .where(eq(staffAccounts.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw Object.assign(new Error("Email already in use"), { status: 409 });
  }

  const passwordHash = await hashPassword(input.password);

  const [created] = await db
    .insert(staffAccounts)
    .values({ ...input, passwordHash, status: "ACTIVE" })
    .returning(safeFields);

  return created;
}

export async function updateStaff(publicId: string, input: UpdateStaffInput) {
  const [updated] = await db
    .update(staffAccounts)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(staffAccounts.publicId, publicId), isNull(staffAccounts.deletedAt)))
    .returning(safeFields);

  if (!updated) throw Object.assign(new Error("Staff not found"), { status: 404 });
  return updated;
}

export async function archiveStaff(publicId: string) {
  const [updated] = await db
    .update(staffAccounts)
    .set({ status: "ARCHIVED", archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(staffAccounts.publicId, publicId), isNull(staffAccounts.deletedAt)))
    .returning(safeFields);

  if (!updated) throw Object.assign(new Error("Staff not found"), { status: 404 });

  // Revoke all active sessions on archive
  const [fullUser] = await db
    .select({ id: staffAccounts.id })
    .from(staffAccounts)
    .where(eq(staffAccounts.publicId, publicId))
    .limit(1);

  if (fullUser) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, fullUser.id), isNull(refreshTokens.revokedAt)));
  }

  return updated;
}

export async function unarchiveStaff(publicId: string) {
  const [updated] = await db
    .update(staffAccounts)
    .set({ status: "ACTIVE", archivedAt: null, updatedAt: new Date() })
    .where(eq(staffAccounts.publicId, publicId))
    .returning(safeFields);

  if (!updated) throw Object.assign(new Error("Staff not found"), { status: 404 });
  return updated;
}

export async function deleteStaff(publicId: string) {
  const [deleted] = await db
    .update(staffAccounts)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(staffAccounts.publicId, publicId), isNull(staffAccounts.deletedAt)))
    .returning({ id: staffAccounts.id });

  if (!deleted) throw Object.assign(new Error("Staff not found"), { status: 404 });
}

export async function resetStaffPassword(publicId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);

  const [user] = await db
    .update(staffAccounts)
    .set({ passwordHash, updatedAt: new Date() })
    .where(and(eq(staffAccounts.publicId, publicId), isNull(staffAccounts.deletedAt)))
    .returning({ id: staffAccounts.id });

  if (!user) throw Object.assign(new Error("Staff not found"), { status: 404 });

  // Revoke all active sessions after password reset
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, user.id), isNull(refreshTokens.revokedAt)));
}
