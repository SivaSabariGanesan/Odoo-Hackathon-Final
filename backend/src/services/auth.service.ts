import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../db/index.ts";
import { staffAccounts, refreshTokens } from "../db/schema/index.ts";
import { hashPassword, verifyPassword, isStrongPassword } from "../utils/password.ts";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from "../utils/token.ts";
import type { SignupInput, LoginInput, ChangePasswordInput } from "../validators/auth.validator.ts";

// ─── Signup (Admin only via this flow) ───────────────────────────────────────

export async function signup(input: SignupInput, ipAddress?: string, userAgent?: string) {
  const existing = await db
    .select({ id: staffAccounts.id })
    .from(staffAccounts)
    .where(eq(staffAccounts.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }

  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(staffAccounts)
    .values({
      name:         input.name,
      email:        input.email,
      passwordHash,
      role:         "ADMIN",
      status:       "ACTIVE",
    })
    .returning({
      id:       staffAccounts.id,
      publicId: staffAccounts.publicId,
      name:     staffAccounts.name,
      email:    staffAccounts.email,
      role:     staffAccounts.role,
    });

  if (!user) throw new Error("Failed to create account");

  const { accessToken, refreshToken } = await issueTokenPair(
    user.id, user.publicId, user.email, user.role as "ADMIN", ipAddress, userAgent
  );

  return {
    user: { id: user.publicId, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(input: LoginInput, ipAddress?: string, userAgent?: string) {
  const [user] = await db
    .select()
    .from(staffAccounts)
    .where(and(
      eq(staffAccounts.email, input.email),
      isNull(staffAccounts.deletedAt)
    ))
    .limit(1);

  if (!user) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  if (user.status === "ARCHIVED") {
    throw Object.assign(new Error("Account is archived"), { status: 403 });
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }

  // Update last login
  await db
    .update(staffAccounts)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(staffAccounts.id, user.id));

  const { accessToken, refreshToken } = await issueTokenPair(
    user.id, user.publicId, user.email, user.role as "ADMIN" | "CASHIER" | "KITCHEN",
    ipAddress, userAgent
  );

  return {
    user: {
      id:    user.publicId,
      name:  user.name,
      email: user.email,
      role:  user.role,
    },
    accessToken,
    refreshToken,
  };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

export async function refresh(rawToken: string, ipAddress?: string, userAgent?: string) {
  const tokenHash = hashRefreshToken(rawToken);

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(and(
      eq(refreshTokens.tokenHash, tokenHash),
      isNull(refreshTokens.revokedAt),
      gt(refreshTokens.expiresAt, new Date())
    ))
    .limit(1);

  if (!stored) {
    throw Object.assign(new Error("Invalid or expired refresh token"), { status: 401 });
  }

  // Revoke old token (rotation)
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, stored.id));

  const [user] = await db
    .select()
    .from(staffAccounts)
    .where(eq(staffAccounts.id, stored.userId))
    .limit(1);

  if (!user || user.status === "ARCHIVED") {
    throw Object.assign(new Error("Account unavailable"), { status: 403 });
  }

  return issueTokenPair(
    user.id, user.publicId, user.email,
    user.role as "ADMIN" | "CASHIER" | "KITCHEN",
    ipAddress, userAgent
  );
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(rawToken: string) {
  const tokenHash = hashRefreshToken(rawToken);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

// ─── Change password ──────────────────────────────────────────────────────────

export async function changePassword(userId: bigint, input: ChangePasswordInput) {
  const [user] = await db
    .select()
    .from(staffAccounts)
    .where(eq(staffAccounts.id, userId))
    .limit(1);

  if (!user) throw Object.assign(new Error("Not found"), { status: 404 });

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error("Current password is incorrect"), { status: 400 });
  }

  const passwordHash = await hashPassword(input.newPassword);
  await db
    .update(staffAccounts)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(staffAccounts.id, userId));

  // Revoke all refresh tokens on password change
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

// ─── Internal: issue token pair ───────────────────────────────────────────────

async function issueTokenPair(
  userId: bigint,
  publicId: string,
  email: string,
  role: "ADMIN" | "CASHIER" | "KITCHEN",
  ipAddress?: string,
  userAgent?: string
) {
  const accessToken  = signAccessToken({ sub: publicId, email, role });
  const rawRefresh   = generateRefreshToken();
  const tokenHash    = hashRefreshToken(rawRefresh);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt: refreshTokenExpiresAt(),
    ipAddress,
    userAgent,
  });

  return { accessToken, refreshToken: rawRefresh };
}
