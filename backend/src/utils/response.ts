import type { Context } from "hono";

export const ok = <T>(c: Context, data: T, status = 200) =>
  c.json({ success: true, data }, status as 200);

export const created = <T>(c: Context, data: T) =>
  c.json({ success: true, data }, 201);

export const err = (c: Context, message: string, status = 400) =>
  c.json({ success: false, message }, status as 400);
