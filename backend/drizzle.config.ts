import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Resolve paths relative to this config file regardless of CWD
const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Load .env from the backend root
config({ path: resolve(__dirname, ".env"), override: true });

export default defineConfig({
  schema: ["./src/db/schema/01_staff.ts", "./src/db/schema/02_products.ts", "./src/db/schema/03_payment_methods.ts", "./src/db/schema/04_floor_tables.ts", "./src/db/schema/05_customers.ts", "./src/db/schema/06_promotions.ts", "./src/db/schema/07_pos_sessions.ts", "./src/db/schema/08_orders.ts", "./src/db/schema/09_payments_receipts.ts", "./src/db/schema/10_kds.ts", "./src/db/schema/11_customer_display.ts", "./src/db/schema/12_self_ordering.ts", "./src/db/schema/13_audit_log.ts", "./src/db/schema/relations.ts"],
  out: resolve(__dirname, "src/db/migrations"),
  dialect: "postgresql",
  dbCredentials: {
    host:     process.env["POSTGRES_HOST"]     ?? "localhost",
    port:     Number(process.env["POSTGRES_PORT"]  ?? 5432),
    user:     process.env["POSTGRES_USER"]     ?? "cafe_user",
    password: process.env["POSTGRES_PASSWORD"] ?? "cafe_pass",
    database: process.env["POSTGRES_DB"]       ?? "cafe_pos",
    ssl:      false,
  },
  verbose: true,
  strict: false,
});
