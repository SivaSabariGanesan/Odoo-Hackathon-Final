import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../../../lib/openapi.ts";
import { authenticate } from "../../../middleware/authenticate.ts";
import { authorize } from "../../../middleware/authorize.ts";
import { configService } from "../services/config.service.ts";
import { qrService } from "../services/qr.service.ts";
import { configUpdateSchema, configResponseSchema } from "../validators/config.schema.ts";

const router = createRouter();

// All admin self-order routes require ADMIN auth
router.use("/config",    authenticate, authorize(["ADMIN"]));
router.use("/qr-codes",  authenticate, authorize(["ADMIN"]));
router.use("/qr/*",      authenticate, authorize(["ADMIN"]));

router.openapi(
  createRoute({
    method: "get",
    path: "/config",
    tags: ["Self Ordering"],
    summary: "Get Self Order Configuration",
    description: "Returns the singleton self-ordering configuration.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Current configuration",
        content: {
          "application/json": {
            schema: configResponseSchema,
          },
        },
      },
    },
  }),
  async (c) => {
    const config = await configService.getConfig();
    return c.json(config as unknown as z.infer<typeof configResponseSchema>);
  }
);

router.openapi(
  createRoute({
    method: "put",
    path: "/config",
    tags: ["Self Ordering"],
    summary: "Update Self Order Configuration",
    description: "Updates or creates the singleton self-ordering configuration.",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: configUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated configuration",
        content: {
          "application/json": {
            schema: configResponseSchema,
          },
        },
      },
      422: {
        description: "Validation error",
      },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    const updatedConfig = await configService.updateConfig(body);
    return c.json(updatedConfig as unknown as z.infer<typeof configResponseSchema>);
  }
);

router.openapi(
  createRoute({
    method: "get",
    path: "/qr-codes",
    tags: ["Self Ordering"],
    summary: "Download All QR Codes",
    security: [{ bearerAuth: [] }],
    request: { query: z.object({ format: z.enum(["pdf"]).optional() }) },
    responses: { 200: { description: "PDF Bundle" } },
  }),
  async (c) => {
    const baseUrl = `${new URL(c.req.url).origin}/api/v1`;
    const pdfBytes = await qrService.getAllTablesQrPdf(baseUrl);
    c.header("Content-Type", "application/pdf");
    c.header("Content-Disposition", 'attachment; filename="all-tables-qr.pdf"');
    return c.body(pdfBytes as any, 200);
  }
);

router.openapi(
  createRoute({
    method: "get",
    path: "/qr/{tableId}",
    tags: ["Self Ordering"],
    summary: "Get QR Code for Table",
    security: [{ bearerAuth: [] }],
    request: { 
      params: z.object({ tableId: z.string().regex(/^\d+$/) }),
      query: z.object({ format: z.enum(["png", "pdf"]).optional() }) 
    },
    responses: { 200: { description: "QR Code image or PDF" }, 404: { description: "Not found" } },
  }),
  async (c) => {
    const { tableId } = c.req.valid("param");
    const { format } = c.req.valid("query");
    const baseUrl = `${new URL(c.req.url).origin}/api/v1`;

    if (format === "pdf") {
      const pdfBytes = await qrService.getTableQrPdf(Number(tableId), baseUrl);
      if (!pdfBytes) return c.json({ error: "TABLE_NOT_FOUND" }, 404);
      c.header("Content-Type", "application/pdf");
      c.header("Content-Disposition", `attachment; filename="table-${tableId}-qr.pdf"`);
      return c.body(pdfBytes as any, 200);
    } else {
      const qrData = await qrService.getTableQr(Number(tableId), baseUrl);
      if (!qrData) return c.json({ error: "TABLE_NOT_FOUND" }, 404);
      c.header("Content-Type", "image/png");
      return c.body(qrData.pngBuffer as any, 200);
    }
  }
);

export { router as adminRoutes };
