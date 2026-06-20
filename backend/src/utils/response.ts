import type { Context } from "hono";
import type { ApiError, ErrorCodeType } from "../types/api.ts";

// ─── Success helpers ──────────────────────────────────────────────────────────

export function ok<T>(c: Context, data: T) {
  return c.json({ success: true as const, data }, 200 as const);
}

export function created<T>(c: Context, data: T) {
  return c.json({ success: true as const, data }, 201 as const);
}

// ─── Error helpers ────────────────────────────────────────────────────────────

export function err(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 500,
  code: ErrorCodeType | string,
  message: string,
  details?: unknown,
) {
  return c.json<ApiError>(
    { success: false, error: { code, message, details } },
    status,
  );
}

export const notFound = (c: Context, message = "Resource not found") =>
  err(c, 404, "NOT_FOUND", message);

export const badRequest = (c: Context, message: string, details?: unknown) =>
  err(c, 400, "VALIDATION_ERROR", message, details);

export const conflict = (c: Context, code: string, message: string) =>
  err(c, 409, code, message);

export const forbidden = (c: Context, message = "Forbidden") =>
  err(c, 403, "FORBIDDEN", message);

export const internalError = (c: Context, message = "Internal server error") =>
  err(c, 500, "INTERNAL_ERROR", message);
