import { OpenAPIHono } from "@hono/zod-openapi";
import { serve } from "@hono/node-server";
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

import { registerDocs } from "./lib/swagger.ts";
import { healthRouter } from "./routes/health.ts";
import { selfOrderRouter } from "./modules/self-order/index.ts";
import { displayRouter } from "./modules/customer-display/index.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../.env"), override: true });

const app = new OpenAPIHono();

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (c) =>
  c.json({ status: "ok", message: "Cafe POS API is running" })
);

app.route("/", healthRouter);
app.route("/api/v1/self-order", selfOrderRouter);
app.route("/api/v1/customer-display", displayRouter);

// ─── Docs (must come after routes) ───────────────────────────────────────────
registerDocs(app);

// ─── Server ───────────────────────────────────────────────────────────────────
const port = Number(process.env["PORT"] ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`🚀  Server    → http://localhost:${port}`);
  console.log(`📖  Swagger   → http://localhost:${port}/swagger`);
  console.log(`📄  OpenAPI   → http://localhost:${port}/doc`);
});
