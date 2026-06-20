import type { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";

/**
 * Registers the OpenAPI JSON spec and Swagger UI onto the main app.
 * Spec:    GET /doc
 * Swagger: GET /swagger
 */
export function registerDocs(app: OpenAPIHono) {
  // Register the Bearer JWT security scheme
  app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  // OpenAPI 3.1 JSON spec
  app.doc("/doc", {
    openapi: "3.1.0",
    info: {
      title: "Cafe POS API",
      version: "1.0.0",
      description:
        "Production-grade REST API for Cafe POS — covers Admin, POS Terminal, KDS, Customer Display, and QR Self Ordering.",
      contact: {
        name: "Cafe POS Team",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development",
      },
    ],
    tags: [
      { name: "Auth",             description: "Staff signup, login, password reset" },
      { name: "Staff",            description: "Staff account management" },
      { name: "Products",         description: "Product categories and products" },
      { name: "Payment Methods",  description: "Cash, Card, UPI QR configuration" },
      { name: "Floors & Tables",  description: "Floor plans and table management" },
      { name: "Customers",        description: "Customer records" },
      { name: "Promotions",       description: "Coupons and automated promotions" },
      { name: "POS Sessions",     description: "Open and close POS sessions" },
      { name: "Orders",           description: "Order lifecycle management" },
      { name: "Order Items",      description: "Line items within an order" },
      { name: "Payments",         description: "Payment processing and records" },
      { name: "Receipts",         description: "Receipt generation and delivery" },
      { name: "KDS",              description: "Kitchen Display System tickets and states" },
      { name: "Customer Display", description: "Customer facing display sync" },
      { name: "Self Ordering",    description: "QR self-order configuration" },
      { name: "Reports",          description: "Revenue, top products, staff performance" },
    ],
    security: [{ bearerAuth: [] }],
  });

  // Swagger UI
  app.get(
    "/swagger",
    swaggerUI({ url: "/doc" })
  );
}
