import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import * as svc from "../services/reports.service.ts";
import { ok, badRequest } from "../utils/response.ts";

const ErrorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
});

const PeriodQuery = z.object({
  period: z.enum(["today", "week", "month", "custom"]).default("today").openapi({ description: "Preset period or 'custom' (requires from + to)" }),
  from: z.string().optional().openapi({ example: "2026-06-01", description: "ISO date, required when period=custom" }),
  to: z.string().optional().openapi({ example: "2026-06-20" }),
  staffId: z.uuid().optional().openapi({ description: "Filter by staff public ID" }),
  sessionId: z.uuid().optional().openapi({ description: "Filter by session public ID" }),
  productId: z.uuid().optional().openapi({ description: "Filter by product public ID (top-products only)" }),
});

const KpiResponse = z.object({
  totalOrders: z.number(),
  revenue: z.string(),
  avgOrderValue: z.string(),
});

const router = createRouter();

// GET /reports/kpis
router.openapi(
  createRoute({
    method: "get",
    path: "/reports/kpis",
    tags: ["Reports"],
    summary: "Dashboard KPIs — total orders, revenue, average order value",
    description: "Aggregates strictly from PAID orders. Composable filters: period, employee, session.",
    request: { query: PeriodQuery },
    responses: {
      200: { description: "KPIs", content: { "application/json": { schema: z.object({ success: z.literal(true), data: KpiResponse }) } } },
      400: { description: "from/to required for custom period", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const params = c.req.valid("query");
    if (params.period === "custom" && (!params.from || !params.to)) {
      return badRequest(c, "from and to are required for custom period") as any;
    }
    const data = await svc.getKpis({
      period: params.period,
      from: params.from,
      to: params.to,
      staffPublicId: params.staffId,
      sessionPublicId: params.sessionId,
    });
    return ok(c, data);
  },
);

// GET /reports/sales-trend
router.openapi(
  createRoute({
    method: "get",
    path: "/reports/sales-trend",
    tags: ["Reports"],
    summary: "Sales trend time series (hourly for today, daily otherwise)",
    request: { query: PeriodQuery.pick({ period: true, from: true, to: true }) },
    responses: {
      200: {
        description: "Time series",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(z.object({ period: z.any(), order_count: z.number(), revenue: z.string() })),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const params = c.req.valid("query");
    const data = await svc.getSalesTrend({ period: params.period, from: params.from, to: params.to });
    return ok(c, data);
  },
);

// GET /reports/top-categories
router.openapi(
  createRoute({
    method: "get",
    path: "/reports/top-categories",
    tags: ["Reports"],
    summary: "Top categories by revenue",
    request: { query: PeriodQuery.pick({ period: true, from: true, to: true }) },
    responses: {
      200: {
        description: "Top categories",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(z.object({
                category_id: z.string(),
                category_name: z.string(),
                color: z.string(),
                order_count: z.number(),
                total_qty: z.number(),
                revenue: z.string(),
              })),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const params = c.req.valid("query");
    const data = await svc.getTopCategories({ period: params.period, from: params.from, to: params.to });
    return ok(c, data as any);
  },
);

// GET /reports/top-products
router.openapi(
  createRoute({
    method: "get",
    path: "/reports/top-products",
    tags: ["Reports"],
    summary: "Top products by quantity sold and revenue",
    request: { query: PeriodQuery.pick({ period: true, from: true, to: true, productId: true }) },
    responses: {
      200: {
        description: "Top products",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(z.object({
                product_id: z.string(),
                product_name: z.string(),
                category_name: z.string(),
                quantity_sold: z.number(),
                revenue: z.string(),
              })),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const params = c.req.valid("query");
    const data = await svc.getTopProducts({ period: params.period, from: params.from, to: params.to, productPublicId: params.productId });
    return ok(c, data as any);
  },
);

// GET /reports/top-orders
router.openapi(
  createRoute({
    method: "get",
    path: "/reports/top-orders",
    tags: ["Reports"],
    summary: "Top orders by grand total value",
    request: { query: PeriodQuery.pick({ period: true, from: true, to: true }) },
    responses: {
      200: {
        description: "Top orders",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(z.object({
                public_id: z.string(),
                order_number: z.string(),
                grand_total: z.string(),
                paid_at: z.any(),
                type: z.string(),
                staff_name: z.string().nullable(),
                table_number: z.string().nullable(),
              })),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const params = c.req.valid("query");
    const data = await svc.getTopOrders({ period: params.period, from: params.from, to: params.to });
    return ok(c, data as any);
  },
);

// GET /reports/export
router.openapi(
  createRoute({
    method: "get",
    path: "/reports/export",
    tags: ["Reports"],
    summary: "Export raw data for PDF/XLS generation",
    description: "Returns live query results for orders, products, or categories. Front-end handles PDF/XLS rendering.",
    request: {
      query: PeriodQuery.pick({ period: true, from: true, to: true }).extend({
        type: z.enum(["orders", "products", "categories"]).default("orders"),
      }),
    },
    responses: {
      200: {
        description: "Export data rows",
        content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(z.any()) }) } },
      },
    },
  }),
  async (c) => {
    const params = c.req.valid("query");
    const data = await svc.getExportData({ period: params.period, from: params.from, to: params.to, type: params.type });
    return ok(c, data as any);
  },
);

export { router as reportsRouter };
