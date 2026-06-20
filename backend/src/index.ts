import "dotenv/config";
import { OpenAPIHono } from "@hono/zod-openapi";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

// ─── BigInt serialization fix ─────────────────────────────────────────────────
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// ─── Routers ──────────────────────────────────────────────────────────────────
import { healthRouter }     from "./routes/health.ts";
import { categoriesRouter } from "./routes/categories.ts";
import { productsRouter }   from "./routes/products.ts";
import { floorsRouter }     from "./routes/floors.ts";
import { customersRouter }  from "./routes/customers.ts";
import { staffRouter }      from "./routes/staff.ts";
import { sessionsRouter }   from "./routes/sessions.ts";
import { ordersRouter }     from "./routes/orders.ts";
import { couponsRouter }    from "./routes/coupons.ts";
import { kdsRouter }        from "./routes/kds.ts";
import { reportsRouter }    from "./routes/reports.ts";
import { selfOrderRouter }  from "./modules/self-order/index.ts";
import { displayRouter }    from "./modules/customer-display/index.ts";

// ─── Swagger registration ─────────────────────────────────────────────────────
import { registerDocs } from "./lib/swagger.ts";

// ─── App ──────────────────────────────────────────────────────────────────────
const app = new OpenAPIHono();

// ─── Global middleware ────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: process.env["CORS_ORIGIN"] ?? "*",
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (c) => c.json({ status: "ok", message: "Cafe POS API is running" }));

app.route("/",                         healthRouter);
app.route("/api",                      categoriesRouter);
app.route("/api",                      productsRouter);
app.route("/api",                      floorsRouter);
app.route("/api",                      customersRouter);
app.route("/api",                      staffRouter);
app.route("/api",                      sessionsRouter);
app.route("/api",                      ordersRouter);
app.route("/api",                      couponsRouter);
app.route("/api",                      kdsRouter);
app.route("/api",                      reportsRouter);
app.route("/api/v1/self-order",        selfOrderRouter);
app.route("/api/v1/customer-display",  displayRouter);

// ─── OpenAPI + Swagger UI ─────────────────────────────────────────────────────
registerDocs(app);

// ─── Fallbacks ────────────────────────────────────────────────────────────────
app.notFound((c) =>
  c.json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }, 404),
);

app.onError((err, c) => {
  console.error(`[error] ${err.name}: ${err.message}`);
  if (err.cause) console.error(`  cause:`, err.cause);
  return c.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    500,
  );
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env["PORT"] ?? 3000);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀  Server    → http://localhost:${PORT}`);
  console.log(`📖  Swagger   → http://localhost:${PORT}/swagger`);
  console.log(`📄  OpenAPI   → http://localhost:${PORT}/doc`);
});

export default app;
