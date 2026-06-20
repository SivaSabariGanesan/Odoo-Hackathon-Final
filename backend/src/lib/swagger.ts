import type { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";

/**
 * Registers the OpenAPI JSON spec and Swagger UI onto the main app.
 * Spec:    GET /doc
 * Swagger: GET /swagger
 */
export function registerDocs(app: OpenAPIHono) {
  // Bearer JWT security scheme (Siva's auth layer)
  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  app.doc("/doc", {
    openapi: "3.1.0",
    info: {
      title: "Cafe POS API",
      version: "1.0.0",
      description: [
        "Production-grade REST API for Cafe POS.",
        "",
        "## Modules",
        "- **Products** — categories, products, bulk ops, tax validation",
        "- **Floors & Tables** — floor plans, table CRUD, derived occupancy status, QR token resolution",
        "- **Customers** — customer records with partial-match search",
        "- **Staff** — employee management, archive vs delete, separate password change",
        "- **POS Sessions** — open/close lifecycle, closing summary, last-session lookup",
        "- **Orders** — full cart engine: draft orders, item mutation, coupon/promotion, send-to-kitchen, mark-paid",
        "- **Promotions** — coupon validation (no side effects) and eligible automated promotions",
        "- **KDS** — kitchen ticket lifecycle, item-level and ticket-level state advance",
        "- **Reports** — KPIs, sales trend, top categories/products/orders, export",
        "- **Customer Auth** — customer self-registration, login, profile",
        "",
        "## Auth",
        "All routes require a Bearer JWT except `/health`, `/floors/tables/resolve/:token`, and customer auth endpoints.",
        "",
        "## Real-time WebSocket",
        "Three WebSocket endpoints share the same HTTP port (upgrade from HTTP):",
        "",
        "| Endpoint | Purpose | Events |",
        "|---|---|---|",
        "| `ws://host/ws/kds` | Kitchen Display | `NEW_ORDER`, `ORDER_UPDATED`, `ORDER_CANCELLED`, `PAYMENT_COMPLETED` |",
        "| `ws://host/ws/customer-display/:sessionId` | Customer screen | `ORDER_CREATED`, `ORDER_STATUS_CHANGED`, `PAYMENT_UPDATED` |",
        "| `ws://host/ws/self-order/:orderId` | Mobile tracking | `ORDER_CONFIRMED`, `PREPARING`, `READY`, `SERVED`, `CANCELLED` |",
        "",
        "All clients receive `{ event: \"CONNECTED\", at: \"<iso>\" }` on connect. Reconnect-safe — just re-open the connection.",
        "",
        "### KDS payload example",
        "```json",
        "{ \"event\": \"NEW_ORDER\", \"orderId\": \"<uuid>\", \"orderNumber\": \"ORD-001\", \"tokenNumber\": 42, \"status\": \"SENT_TO_KITCHEN\", \"items\": [{\"name\": \"Latte\", \"quantity\": 2}], \"at\": \"2024-06-21T10:00:00Z\" }",
        "```",
        "",
        "## REST additions",
        "- `DELETE /api/orders/:id` — hard-delete DRAFT orders (204 No Content)",
        "- `PATCH /api/users/:id/archive` — spec alias for `POST /api/staff/:id/archive`",
        "- `POST /api/v1/customer/auth/register` — customer self-registration",
        "- `POST /api/v1/customer/auth/login` — customer login",
        "- `GET /api/v1/customer/auth/me` — customer profile",
        "",
        "## Real-time events (internal emit)",
        "The API also fires internal events at key moments:",
        "`order_state_changed`, `kds_ticket_pushed`, `kds_item_mutated`, `category_color_updated`, `order_completed`, `table_occupancy_changed`",
      ].join("\n"),
      contact: { name: "Cafe POS Team — Giri (Core POS Logic)" },
    },
    servers: [
      { url: "http://localhost:3000", description: "Local development" },
    ],
    tags: [
      // Existing (Siva's modules — placeholders so tags show in correct order)
      { name: "Customer Auth",   description: "Customer self-registration, login, profile (JWT-scoped to CUSTOMER role)" },
      { name: "Auth",             description: "Staff signup, login, password reset" },
      { name: "Payment Methods",  description: "Cash, Card, UPI QR configuration (Siva's module)" },
      { name: "Payments",         description: "Payment processing and records (Siva's module)" },
      { name: "Receipts",         description: "Receipt generation and delivery (Siva's module)" },
      { name: "Customer Display", description: "Customer facing display sync (Siva's module)" },
      { name: "Self Ordering",    description: "QR self-order configuration (KO's module)" },

      // Giri's modules
      { name: "Products",       description: "Product categories and menu items — CRUD, bulk ops, tax validation, KDS visibility" },
      { name: "Floors & Tables", description: "Floor plans, table management, derived occupancy, QR token resolution" },
      { name: "Customers",      description: "Customer records with partial-match search across name / email / phone" },
      { name: "Staff",          description: "Employee management — update profile, archive (not delete), change password" },
      { name: "POS Sessions",   description: "Open/close POS sessions, closing summary, session history for Reports" },
      { name: "Orders",         description: "Order lifecycle — draft, cart mutations, coupon, send-to-kitchen, mark-paid (concurrency guarded)" },
      { name: "Promotions",     description: "Coupon validation (read-only) and eligible automated promotion listing" },
      { name: "KDS",            description: "Kitchen Display System — ticket lifecycle, item-level and ticket-level state advance" },
      { name: "Reports",        description: "Revenue KPIs, sales trend, top categories/products/orders, export data" },
    ],
    security: [{ bearerAuth: [] }],
  });

  // Swagger UI
  app.get("/swagger", swaggerUI({ url: "/doc" }));
}
