// ─── Order number generation ──────────────────────────────────────────────────
// Format: ORD-YYYYMMDD-NNNN  (e.g. ORD-20260620-0001)
// The NNNN sequence resets daily and is derived from a DB count, not a DB sequence,
// so it works without extra schema objects.

import { db } from "../db/index.ts";
import { orders } from "../db/schema/index.ts";
import { sql } from "drizzle-orm";

export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

  // Count orders created today to derive sequence
  const result = await db.execute(
    sql`SELECT COUNT(*)::int AS cnt FROM orders
        WHERE DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE`,
  );
  const cnt = (result.rows[0] as { cnt: number }).cnt ?? 0;
  const seq = String(cnt + 1).padStart(4, "0");

  return `ORD-${date}-${seq}`;
}

export async function generateReceiptNumber(orderId: bigint): Promise<string> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `RCP-${date}-${String(orderId).padStart(6, "0")}`;
}
