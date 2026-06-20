import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import * as svc from "../services/customer.service.ts";
import { ok, created, notFound } from "../utils/response.ts";

const ErrorResponse = z.object({ success: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) });

const CustomerBody = z.object({
  name: z.string().min(1).max(100).openapi({ example: "Ravi Kumar" }),
  email: z.string().email().optional().openapi({ example: "ravi@example.com" }),
  phone: z.string().min(7).max(20).optional().openapi({ example: "+919876543210" }),
});

const CustomerResponse = z.object({ id: z.any(), publicId: z.string().uuid(), name: z.string(), email: z.string().nullable(), phone: z.string().nullable() }).passthrough();

const router = createRouter();

// All customer routes require authentication
router.use("/customers",    authenticate);
router.use("/customers/*",  authenticate);

// GET /customers
router.openapi(
  createRoute({
    method: "get", path: "/customers",
    tags: ["Customers"],
    summary: "List customers with optional search across name/email/phone",
    request: {
      query: z.object({
        search: z.string().optional().openapi({ description: "Partial match on name, email, or phone" }),
        page: z.string().optional(),
        pageSize: z.string().optional(),
      }),
    },
    responses: { 200: { description: "Customers", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(CustomerResponse) }) } } } },
  }),
  async (c) => {
    const { search, page, pageSize } = c.req.valid("query");
    const result = await svc.listCustomers({ search, page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined });
    return ok(c, result.rows);
  },
);

// GET /customers/:id
router.openapi(
  createRoute({
    method: "get", path: "/customers/{id}",
    tags: ["Customers"],
    summary: "Get a customer by public ID",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Customer", content: { "application/json": { schema: z.object({ success: z.literal(true), data: CustomerResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const customer = await svc.getCustomerById(c.req.param("id"));
    if (!customer) return notFound(c, "Customer not found") as any;
    return ok(c, customer);
  },
);

// POST /customers
router.openapi(
  createRoute({
    method: "post", path: "/customers",
    tags: ["Customers"],
    summary: "Create a customer",
    request: { body: { content: { "application/json": { schema: CustomerBody } }, required: true } },
    responses: { 201: { description: "Created", content: { "application/json": { schema: z.object({ success: z.literal(true), data: CustomerResponse }) } } } },
  }),
  async (c) => created(c, await svc.createCustomer(c.req.valid("json")) as any),
);

// PATCH /customers/:id
router.openapi(
  createRoute({
    method: "patch", path: "/customers/{id}",
    tags: ["Customers"],
    summary: "Update a customer",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: CustomerBody.partial() } }, required: true },
    },
    responses: {
      200: { description: "Updated", content: { "application/json": { schema: z.object({ success: z.literal(true), data: CustomerResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const customer = await svc.updateCustomer(c.req.param("id"), c.req.valid("json"));
    if (!customer) return notFound(c, "Customer not found") as any;
    return ok(c, customer);
  },
);

// DELETE /customers/:id
router.openapi(
  createRoute({
    method: "delete", path: "/customers/{id}",
    tags: ["Customers"],
    summary: "Soft-delete a customer",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ deleted: z.boolean() }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const result = await svc.deleteCustomer(c.req.param("id"));
    if (!result.found) return notFound(c, "Customer not found") as any;
    return ok(c, { deleted: true });
  },
);

export { router as customersRouter };
