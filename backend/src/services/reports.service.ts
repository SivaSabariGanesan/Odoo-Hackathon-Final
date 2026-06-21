import { eq, gte, lte, sql, and } from "drizzle-orm";
import { db } from "../db/index.ts";
import { orders, staffAccounts, posSessions } from "../db/schema/index.ts";

// ─── Period helpers ───────────────────────────────────────────────────────────

function getPeriodBounds(
  period: "today" | "week" | "month" | "custom",
  from?: string,
  to?: string,
): { from: Date; to: Date } {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }
  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start, to: now };
  }
  // custom
  return {
    from: from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1),
    to: to ? new Date(to) : now,
  };
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export async function getKpis(params: {
  period: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
  staffPublicId?: string;
  sessionPublicId?: string;
}) {
  const { from, to } = getPeriodBounds(params.period, params.from, params.to);

  const conditions: any[] = [
    eq(orders.status, "PAID"),
    gte(orders.paidAt, from),
    lte(orders.paidAt, to),
  ];

  if (params.staffPublicId) {
    const staff = await db.query.staffAccounts.findFirst({
      where: eq(staffAccounts.publicId, params.staffPublicId),
    });
    if (staff) conditions.push(eq(orders.staffId, staff.id));
  }

  if (params.sessionPublicId) {
    const session = await db.query.posSessions.findFirst({
      where: eq(posSessions.publicId, params.sessionPublicId),
    });
    if (session) conditions.push(eq(orders.sessionId, session.id));
  }

  const kpiRows = await db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      revenue: sql<string>`COALESCE(SUM(grand_total), 0)::text`,
      avgOrderValue: sql<string>`COALESCE(AVG(grand_total), 0)::text`,
    })
    .from(orders)
    .where(and(...conditions));

  const result = kpiRows[0];
  return {
    totalOrders: result?.totalOrders ?? 0,
    revenue: result?.revenue ?? "0.00",
    avgOrderValue: result?.avgOrderValue ?? "0.00",
  };
}

// ─── Sales trend ──────────────────────────────────────────────────────────────

export async function getSalesTrend(params: {
  period: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
}) {
  const { from, to } = getPeriodBounds(params.period, params.from, params.to);

  const granularity = params.period === "today" ? "hour" : "day";

  const rows = await db.execute(
    sql`
      SELECT
        DATE_TRUNC(${granularity}, paid_at) AS period,
        COUNT(*)::int AS order_count,
        COALESCE(SUM(grand_total), 0)::text AS revenue
      FROM orders
      WHERE status = 'PAID'
        AND paid_at >= ${from}
        AND paid_at <= ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  );

  return rows.rows as Array<{ period: Date; order_count: number; revenue: string }>;
}

// ─── Top categories ───────────────────────────────────────────────────────────

export async function getTopCategories(params: {
  period: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { from, to } = getPeriodBounds(params.period, params.from, params.to);
  const limit = params.limit ?? 10;

  const rows = await db.execute(
    sql`
      SELECT
        pc.public_id AS category_id,
        pc.name AS category_name,
        pc.color,
        COUNT(DISTINCT o.id)::int AS order_count,
        SUM(oi.quantity)::int AS total_qty,
        COALESCE(SUM(oi.line_total), 0)::text AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      JOIN product_categories pc ON pc.id = p.category_id
      WHERE o.status = 'PAID'
        AND o.paid_at >= ${from}
        AND o.paid_at <= ${to}
      GROUP BY pc.public_id, pc.name, pc.color
      ORDER BY COALESCE(SUM(oi.line_total), 0) DESC
      LIMIT ${limit}
    `,
  );

  return rows.rows;
}

// ─── Top products ─────────────────────────────────────────────────────────────

export async function getTopProducts(params: {
  period: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
  productPublicId?: string;
  limit?: number;
}) {
  const { from, to } = getPeriodBounds(params.period, params.from, params.to);
  const limit = params.limit ?? 10;

  let productFilter = sql`1=1`;
  if (params.productPublicId) {
    productFilter = sql`p.public_id = ${params.productPublicId}`;
  }

  const rows = await db.execute(
    sql`
      SELECT
        p.public_id AS product_id,
        p.name AS product_name,
        pc.name AS category_name,
        SUM(oi.quantity)::int AS quantity_sold,
        COALESCE(SUM(oi.line_total), 0)::text AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      JOIN product_categories pc ON pc.id = p.category_id
      WHERE o.status = 'PAID'
        AND o.paid_at >= ${from}
        AND o.paid_at <= ${to}
        AND ${productFilter}
      GROUP BY p.public_id, p.name, pc.name
      ORDER BY quantity_sold DESC
      LIMIT ${limit}
    `,
  );

  return rows.rows;
}

// ─── Top orders by value ──────────────────────────────────────────────────────

export async function getTopOrders(params: {
  period: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { from, to } = getPeriodBounds(params.period, params.from, params.to);
  const limit = params.limit ?? 10;

  const rows = await db.execute(
    sql`
      SELECT
        o.public_id,
        o.order_number,
        o.grand_total::text,
        o.paid_at,
        o.type,
        s.name AS staff_name,
        ft.table_number
      FROM orders o
      LEFT JOIN staff_accounts s ON s.id = o.staff_id
      LEFT JOIN floor_tables ft ON ft.id = o.table_id
      WHERE o.status = 'PAID'
        AND o.paid_at >= ${from}
        AND o.paid_at <= ${to}
      ORDER BY o.grand_total DESC
      LIMIT ${limit}
    `,
  );

  return rows.rows;
}

// ─── Export data (raw rows for PDF/XLS generation in a future layer) ─────────

export async function getExportData(params: {
  period: "today" | "week" | "month" | "custom";
  from?: string;
  to?: string;
  type: "orders" | "products" | "categories";
}) {
  const { from, to } = getPeriodBounds(params.period, params.from, params.to);

  if (params.type === "orders") {
    return db.execute(sql`
      SELECT
        o.order_number, o.type, o.status,
        o.subtotal::text, o.tax_amount::text, o.discount_amount::text, o.grand_total::text,
        o.paid_at, o.created_at,
        s.name AS cashier,
        ft.table_number,
        c.name AS customer
      FROM orders o
      LEFT JOIN staff_accounts s ON s.id = o.staff_id
      LEFT JOIN floor_tables ft ON ft.id = o.table_id
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.status = 'PAID'
        AND o.paid_at >= ${from} AND o.paid_at <= ${to}
      ORDER BY o.paid_at DESC
    `).then((r) => r.rows);
  }

  if (params.type === "products") {
    return getTopProducts({ period: params.period, from: params.from, to: params.to, limit: 1000 });
  }

  return getTopCategories({ period: params.period, from: params.from, to: params.to, limit: 100 });
}
