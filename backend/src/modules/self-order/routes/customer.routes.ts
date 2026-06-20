import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../../lib/openapi.ts";
import { posCoreStubs } from "../../../services/pos-core-stubs.ts";
import { configService } from "../services/config.service.ts";
import { authService } from "../services/auth.service.ts";
import { menuService } from "../services/menu.service.ts";
import { orderHistoryService } from "../services/order-history.service.ts";
import { customerAuthMiddleware } from "../middleware/customer-auth.ts";
import { addItemSchema, updateItemSchema } from "../validators/cart.schema.ts";
import { couponSchema } from "../validators/checkout.schema.ts";

const router = createRouter();

router.openapi(
  createRoute({
    method: "get",
    path: "/s/{token}",
    tags: ["Self Ordering"],
    summary: "Resolve Table by QR Token",
    description: "Returns table info and a short-lived customer session JWT.",
    security: [], // public
    request: {
      params: z.object({
        token: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: "Table resolved successfully",
        content: {
          "application/json": {
            schema: z.object({
              tableId: z.string(),
              tableNumber: z.string(),
              sessionToken: z.string(),
              welcomeMessage: z.string().nullable(),
            }),
          },
        },
      },
      404: {
        description: "Invalid token",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              message: z.string(),
            }),
          },
        },
      },
      409: {
        description: "Table inactive",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              message: z.string(),
            }),
          },
        },
      },
      503: {
        description: "Self order disabled",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const config = await configService.getConfig();
    if (!config || !config.isEnabled) {
      return c.json({ error: "SELF_ORDER_DISABLED" }, 503);
    }

    const { token } = c.req.valid("param");
    const table = await posCoreStubs.resolveTableByToken(token);

    if (!table) {
      return c.json({ error: "INVALID_TOKEN", message: "This QR code is not valid." }, 404);
    }

    if (!table.isActive || table.state === "PAYMENT_PENDING") {
      return c.json({ error: "TABLE_INACTIVE", message: "This table is not currently accepting orders." }, 409);
    }

    const sessionToken = authService.generateCustomerToken(table.id.toString());

    return c.json({
      tableId: table.id.toString(),
      tableNumber: table.tableNumber,
      sessionToken,
      welcomeMessage: config ? config.welcomeMessage : null,
    }, 200);
  }
);

const productSchema = z.object({
  publicId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  price: z.string(),
  taxType: z.string(),
  taxRate: z.string(),
  uom: z.string(),
  categoryId: z.string().uuid().nullable(),
  isFeatured: z.boolean(),
});

router.openapi(
  createRoute({
    method: "get",
    path: "/s/{token}/menu/categories",
    tags: ["Self Ordering"],
    summary: "Get Menu Categories",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: {
      params: z.object({ token: z.string().uuid() }),
    },
    responses: {
      200: {
        description: "List of categories",
        content: {
          "application/json": {
            schema: z.array(z.object({
              publicId: z.string().uuid(),
              name: z.string(),
              color: z.string(),
              sortOrder: z.number(),
            })),
          },
        },
      },
    },
  }),
  async (c) => {
    const categories = await menuService.getCategories();
    return c.json(categories, 200);
  }
);

router.openapi(
  createRoute({
    method: "get",
    path: "/s/{token}/menu/products",
    tags: ["Self Ordering"],
    summary: "Get Menu Products",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: {
      params: z.object({ token: z.string().uuid() }),
      query: z.object({
        category: z.string().uuid().optional(),
        search: z.string().optional(),
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
      }),
    },
    responses: {
      200: {
        description: "List of products",
        content: {
          "application/json": {
            schema: z.array(productSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const { category, search, page, limit } = c.req.valid("query");
    const products = await menuService.getProducts(
      category,
      search,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20
    );
    return c.json(products, 200);
  }
);

router.openapi(
  createRoute({
    method: "get",
    path: "/s/{token}/menu/products/{id}",
    tags: ["Self Ordering"],
    summary: "Get Product Detail",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: {
      params: z.object({ 
        token: z.string().uuid(),
        id: z.string().uuid(),
      }),
    },
    responses: {
      200: {
        description: "Product details",
        content: {
          "application/json": {
            schema: productSchema,
          },
        },
      },
      404: {
        description: "Product unavailable",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const product = await menuService.getProduct(id);
    
    if (!product || !product.isAvailable || product.deletedAt !== null) {
      return c.json({ error: "PRODUCT_UNAVAILABLE" }, 404);
    }
    
    return c.json(product, 200);
  }
);

router.openapi(
  createRoute({
    method: "get",
    path: "/s/{token}/cart",
    tags: ["Self Ordering"],
    summary: "Get Cart",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: { params: z.object({ token: z.string().uuid() }) },
    responses: { 200: { description: "Cart info" } },
  }),
  async (c) => {
    const tableId = c.get("tableId");
    const order = await posCoreStubs.getOrCreateDraftForTable(tableId);
    const totals = await posCoreStubs.calculateTotals(order.id);
    return c.json({ ...order, totals }, 200);
  }
);

router.openapi(
  createRoute({
    method: "post",
    path: "/s/{token}/cart/items",
    tags: ["Self Ordering"],
    summary: "Add Item to Cart",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: {
      params: z.object({ token: z.string().uuid() }),
      body: { content: { "application/json": { schema: addItemSchema } } },
    },
    responses: { 200: { description: "Success" } },
  }),
  async (c) => {
    const tableId = c.get("tableId");
    const body = c.req.valid("json");
    const product = await menuService.getProduct(body.productId);
    
    if (!product || !product.isAvailable) {
      return c.json({ error: "PRODUCT_UNAVAILABLE" }, 422);
    }
    
    const order = await posCoreStubs.getOrCreateDraftForTable(tableId);
    await posCoreStubs.addItemToCart(order.id, body);
    
    return c.json({ success: true }, 200);
  }
);

router.openapi(
  createRoute({
    method: "patch",
    path: "/s/{token}/cart/items/{itemId}",
    tags: ["Self Ordering"],
    summary: "Update Cart Item",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: {
      params: z.object({ token: z.string().uuid(), itemId: z.string() }),
      body: { content: { "application/json": { schema: updateItemSchema } } },
    },
    responses: { 200: { description: "Success" } },
  }),
  async (c) => {
    const tableId = c.get("tableId");
    const { itemId } = c.req.valid("param");
    const body = c.req.valid("json");
    
    const order = await posCoreStubs.getOrCreateDraftForTable(tableId);
    
    if (body.quantity && body.quantity <= 0) {
      await posCoreStubs.removeCartItem(order.id, Number(itemId));
    } else {
      await posCoreStubs.updateCartItem(order.id, Number(itemId), body);
    }
    
    return c.json({ success: true }, 200);
  }
);

router.openapi(
  createRoute({
    method: "delete",
    path: "/s/{token}/cart/items/{itemId}",
    tags: ["Self Ordering"],
    summary: "Delete Cart Item",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: { params: z.object({ token: z.string().uuid(), itemId: z.string() }) },
    responses: { 200: { description: "Success" } },
  }),
  async (c) => {
    const tableId = c.get("tableId");
    const { itemId } = c.req.valid("param");
    const order = await posCoreStubs.getOrCreateDraftForTable(tableId);
    await posCoreStubs.removeCartItem(order.id, Number(itemId));
    return c.json({ success: true }, 200);
  }
);

router.openapi(
  createRoute({
    method: "post",
    path: "/s/{token}/coupon/validate",
    tags: ["Self Ordering"],
    summary: "Validate Coupon",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: {
      params: z.object({ token: z.string().uuid() }),
      body: { content: { "application/json": { schema: couponSchema } } },
    },
    responses: { 200: { description: "Success" } },
  }),
  async (c) => {
    const tableId = c.get("tableId");
    const order = await posCoreStubs.getOrCreateDraftForTable(tableId);
    const eligible = await posCoreStubs.getEligiblePromotions(order.id);
    return c.json({ eligible }, 200);
  }
);

router.openapi(
  createRoute({
    method: "post",
    path: "/s/{token}/coupon/apply",
    tags: ["Self Ordering"],
    summary: "Apply Coupon",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: {
      params: z.object({ token: z.string().uuid() }),
      body: { content: { "application/json": { schema: couponSchema } } },
    },
    responses: { 200: { description: "Success" } },
  }),
  async (c) => {
    const tableId = c.get("tableId");
    const { code } = c.req.valid("json");
    const order = await posCoreStubs.getOrCreateDraftForTable(tableId);
    await posCoreStubs.applyCoupon(order.id, code);
    return c.json({ success: true }, 200);
  }
);

router.openapi(
  createRoute({
    method: "post",
    path: "/s/{token}/checkout",
    tags: ["Self Ordering"],
    summary: "Checkout",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: { params: z.object({ token: z.string().uuid() }) },
    responses: { 200: { description: "Success" } },
  }),
  async (c) => {
    const tableId = c.get("tableId");
    const order = await posCoreStubs.getOrCreateDraftForTable(tableId);
    
    await posCoreStubs.calculateTotals(order.id);
    await posCoreStubs.sendToKitchen(order.id);
    
    return c.json({ 
      orderId: order.id,
      status: "SENT_TO_KITCHEN"
    }, 200);
  }
);

router.openapi(
  createRoute({
    method: "get",
    path: "/s/{token}/orders",
    tags: ["Self Ordering"],
    summary: "Get Order History",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: { params: z.object({ token: z.string().uuid() }) },
    responses: { 200: { description: "List of orders" } },
  }),
  async (c) => {
    const tableId = c.get("tableId");
    const orders = await orderHistoryService.getOrderHistory(tableId);
    return c.json(orders, 200);
  }
);

router.openapi(
  createRoute({
    method: "get",
    path: "/s/{token}/orders/{orderId}",
    tags: ["Self Ordering"],
    summary: "Get Order Details",
    security: [{ bearerAuth: [] }],
    middleware: [customerAuthMiddleware] as const,
    request: { params: z.object({ token: z.string().uuid(), orderId: z.string().uuid() }) },
    responses: { 200: { description: "Order detail" }, 403: { description: "Access denied" } },
  }),
  async (c) => {
    const tableId = c.get("tableId");
    const { orderId } = c.req.valid("param");
    const order = await orderHistoryService.getOrderDetail(tableId, orderId);
    
    if (!order) {
      return c.json({ error: "ORDER_ACCESS_DENIED" }, 403);
    }
    
    return c.json(order, 200);
  }
);

export { router as customerRoutes };
