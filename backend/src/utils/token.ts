import jwt from "jsonwebtoken";
import crypto from "crypto";
import { authConfig } from "../config/auth.ts";
import type { JwtPayload, Role } from "../types/auth.ts";

// ─── Access Token ─────────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.accessTokenExpiry,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, authConfig.jwt.secret) as JwtPayload;
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

/** Generates a cryptographically random opaque refresh token string */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

/** Returns the SHA-256 hash of a raw refresh token for safe DB storage */
export function hashRefreshToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Returns expiry Date object for a new refresh token */
export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + authConfig.jwt.refreshTokenExpiryMs);
}
