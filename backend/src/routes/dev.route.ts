import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "../lib/openapi.ts";
import { db } from "../db/index.ts";
import { orders, payments, paymentTransactions, receipts } from "../db/schema/index.ts";
import { eq } from "drizzle-orm";
import { ok, err } from "../utils/response.ts";

const router = createRouter();

// Only enable in development
if (process.env.NODE_ENV !== "production") {
  
  // ─── POST /api/dev/reset-order/:id ─────────────────────────────────────────
  router.openapi(
    createRoute({
      method: "post",
      path: "/api/dev/reset-order/{id}",
      tags: ["Development"],
      summary: "[DEV ONLY] Reset order status to READY for payment testing",
      request: {
        params: z.object({ id: z.string().uuid() }),
      },
      responses: {
        200: { description: "Order reset successfully" },
        404: { description: "Order not found" },
      },
    }),
    async (c) => {
      const orderId = c.req.param("id");
      
      const order = await db.query.orders.findFirst({
        where: eq(orders.publicId, orderId),
      });
      
      if (!order) {
        return err(c, 404, "NOT_FOUND", "Order not found");
      }
      
      // Reset order status
      await db.update(orders)
        .set({
          status: "READY",
          paidAt: null,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
      
      // Optional: clear payment records (uncomment if needed)
      // await db.delete(payments).where(eq(payments.orderId, order.id));
      // await db.delete(paymentTransactions).where(eq(paymentTransactions.orderId, order.id));
      // await db.delete(receipts).where(eq(receipts.orderId, order.id));
      
      return ok(c, {
        message: "Order reset to READY status",
        orderId: order.publicId,
        orderNumber: order.orderNumber,
      });
    }
  );
}

export { router as devRouter };
