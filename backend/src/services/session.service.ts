import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { posSessions, orders, staffAccounts } from "../db/schema/index.ts";

export async function getLastClosedSession() {
  return db.query.posSessions.findFirst({
    where: eq(posSessions.status, "CLOSED"),
    orderBy: [desc(posSessions.closedAt)],
    with: {
      openedBy: {
        columns: { publicId: true, name: true },
      },
    },
  });
}

export async function openSession(staffId: bigint, openingCash = 0) {
  // Only one OPEN session allowed at a time
  const existing = await db.query.posSessions.findFirst({
    where: eq(posSessions.status, "OPEN"),
  });
  if (existing) {
    return { error: "SESSION_ALREADY_OPEN" as const, session: existing };
  }

  const [session] = await db.insert(posSessions).values({
    openedById: staffId,
    status: "OPEN",
    openingCash: String(openingCash),
    openedAt: new Date(),
  }).returning();

  return { session };
}

export async function closeSession(sessionPublicId: string, closedByStaffId: bigint) {
  const session = await db.query.posSessions.findFirst({
    where: eq(posSessions.publicId, sessionPublicId),
  });
  if (!session) return { found: false as const };
  if (session.status !== "OPEN") return { found: true, error: "SESSION_NOT_OPEN" as const };

  // Aggregate total sales from Paid orders in this session
  const salesRes = await db
    .select({ total: sql<string>`COALESCE(SUM(grand_total), 0)::text` })
    .from(orders)
    .where(and(eq(orders.sessionId, session.id), eq(orders.status, "PAID")));

  const closingSaleAmount = salesRes[0]?.total ?? "0.00";

  const [closed] = await db.update(posSessions)
    .set({
      status: "CLOSED",
      closedById: closedByStaffId,
      closedAt: new Date(),
      actualCash: closingSaleAmount,
      closingSaleAmount,
      updatedAt: new Date(),
    })
    .where(eq(posSessions.id, session.id))
    .returning();

  // Closing summary
  const orderCountRes = await db
    .select({ orderCount: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.sessionId, session.id), eq(orders.status, "PAID")));

  return {
    found: true,
    session: closed,
    summary: {
      totalSales: closingSaleAmount,
      paidOrderCount: orderCountRes[0]?.orderCount ?? 0,
    },
  };
}

export async function getSessionById(publicId: string) {
  return db.query.posSessions.findFirst({
    where: eq(posSessions.publicId, publicId),
    with: {
      openedBy: { columns: { publicId: true, name: true } },
      closedBy: { columns: { publicId: true, name: true } },
    },
  });
}

export async function listSessions(params: { page?: number; pageSize?: number }) {
  const { page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  const rows = await db.query.posSessions.findMany({
    with: {
      openedBy: { columns: { publicId: true, name: true } },
      closedBy: { columns: { publicId: true, name: true } },
    },
    orderBy: [desc(posSessions.openedAt)],
    limit: pageSize,
    offset,
  });

  const countRes = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(posSessions);

  return { rows, total: countRes[0]?.total ?? 0 };
}
