import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { authenticate } from "../middleware/authenticate.ts";
import * as svc from "../services/session.service.ts";
import { ok, created, notFound, conflict, err } from "../utils/response.ts";

const ErrorResponse = z.object({ success: z.literal(false), error: z.object({ code: z.string(), message: z.string() }) });

const SessionResponse = z.object({
  id: z.any(), publicId: z.string().uuid(),
  status: z.enum(["OPEN", "CLOSED"]),
  openingCash: z.string(), closingCash: z.string().nullable(),
  closingSaleAmount: z.string().nullable().optional(),
  openedAt: z.string().datetime(), closedAt: z.string().datetime().nullable(),
  openedBy: z.object({ publicId: z.string(), name: z.string() }).nullable().optional(),
}).passthrough();

const router = createRouter();

// All session routes require authentication
router.use("/sessions",           authenticate);
router.use("/sessions/*",         authenticate);

// GET /sessions/last-closed
router.openapi(
  createRoute({
    method: "get", path: "/sessions/last-closed",
    tags: ["POS Sessions"],
    summary: "Get the last closed session (shown on POS landing screen)",
    responses: { 200: { description: "Last closed session or null", content: { "application/json": { schema: z.object({ success: z.literal(true), data: SessionResponse.nullable() }) } } } },
  }),
  async (c) => ok(c, (await svc.getLastClosedSession()) ?? null),
);

// GET /sessions
router.openapi(
  createRoute({
    method: "get", path: "/sessions",
    tags: ["POS Sessions"],
    summary: "List all sessions (for Reports filter)",
    request: { query: z.object({ page: z.string().optional(), pageSize: z.string().optional() }) },
    responses: { 200: { description: "Sessions", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.array(SessionResponse) }) } } } },
  }),
  async (c) => {
    const { page, pageSize } = c.req.valid("query");
    const result = await svc.listSessions({ page: page ? Number(page) : undefined, pageSize: pageSize ? Number(pageSize) : undefined });
    return ok(c, result.rows);
  },
);

// GET /sessions/:id
router.openapi(
  createRoute({
    method: "get", path: "/sessions/{id}",
    tags: ["POS Sessions"],
    summary: "Get a session by public ID",
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: { description: "Session", content: { "application/json": { schema: z.object({ success: z.literal(true), data: SessionResponse }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const session = await svc.getSessionById(c.req.param("id"));
    if (!session) return notFound(c, "Session not found") as any;
    return ok(c, session);
  },
);

// POST /sessions/open
router.openapi(
  createRoute({
    method: "post", path: "/sessions/open",
    tags: ["POS Sessions"],
    summary: "Open a new POS session",
    description: "Requires auth. Only one OPEN session allowed at a time.",
    request: { body: { content: { "application/json": { schema: z.object({ openingCash: z.number().min(0).optional().openapi({ example: 1000 }) }) } }, required: false } },
    responses: {
      201: { description: "Session opened", content: { "application/json": { schema: z.object({ success: z.literal(true), data: SessionResponse }) } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Session already open", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const user = c.get("user");
    if (!user) return err(c, 401, "UNAUTHORIZED", "Authentication required") as any;
    const body = await c.req.json().catch(() => ({}));
    const result = await svc.openSession(BigInt(user.id), (body as any).openingCash ?? 0);
    if ("error" in result) return conflict(c, "SESSION_ALREADY_OPEN", "A session is already open") as any;
    return created(c, result.session);
  },
);

// POST /sessions/:id/close
router.openapi(
  createRoute({
    method: "post", path: "/sessions/{id}/close",
    tags: ["POS Sessions"],
    summary: "Close a POS session and return the closing summary",
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { "application/json": { schema: z.object({ closingCash: z.number().min(0).optional() }) } }, required: false },
    },
    responses: {
      200: { description: "Session closed with summary", content: { "application/json": { schema: z.object({ success: z.literal(true), data: z.object({ session: SessionResponse, summary: z.object({ totalSales: z.string(), paidOrderCount: z.number() }) }) }) } } },
      404: { description: "Not found", content: { "application/json": { schema: ErrorResponse } } },
      409: { description: "Session already closed", content: { "application/json": { schema: ErrorResponse } } },
    },
  }),
  async (c) => {
    const user = c.get("user");
    if (!user) return err(c, 401, "UNAUTHORIZED", "Authentication required") as any;
    const result = await svc.closeSession(c.req.param("id"), BigInt(user.id));
    if (!result.found) return notFound(c, "Session not found") as any;
    if ("error" in result) return conflict(c, "SESSION_NOT_OPEN", "Session is not open") as any;
    return ok(c, { session: result.session, summary: result.summary });
  },
);

export { router as sessionsRouter };
