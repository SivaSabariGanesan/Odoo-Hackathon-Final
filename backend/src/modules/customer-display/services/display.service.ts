import { db } from "../../../db/index.ts";
import { customerDisplaySessions } from "../../../db/schema/11_customer_display.ts";
import { orders, orderItems } from "../../../db/schema/08_orders.ts";
import { eq } from "drizzle-orm";

export class CustomerDisplayService {
  /**
   * Fetches the current display state.
   */
  async getTerminalState(terminalId: string) {
    const [session] = await db
      .select()
      .from(customerDisplaySessions)
      .where(eq(customerDisplaySessions.terminalId, terminalId))
      .limit(1);

    if (!session) {
      // Auto-register terminal if not found
      const [newSession] = await db
        .insert(customerDisplaySessions)
        .values({ terminalId, displayState: "IDLE" })
        .returning();
      return this.mapSession(newSession);
    }

    // Update last seen
    await db.update(customerDisplaySessions)
      .set({ lastSeenAt: new Date(), isOnline: true })
      .where(eq(customerDisplaySessions.id, session.id));

    return this.mapSession(session);
  }

  /**
   * Upserts the terminal state and automatically caches required payloads.
   */
  async updateTerminalState(terminalId: string, stateUpdate: {
    state: "IDLE" | "ORDER_VIEW" | "PAYMENT_VIEW" | "COMPLETION_VIEW";
    orderId?: number;
    upiString?: string;
    message?: string;
  }) {
    let payloadStr: string | null = null;
    let activeOrderId: number | null = stateUpdate.orderId || null;

    if (stateUpdate.state === "ORDER_VIEW" && activeOrderId) {
      const orderData = await this.fetchOrderPayload(activeOrderId);
      payloadStr = JSON.stringify(orderData);
    } else if (stateUpdate.state === "PAYMENT_VIEW") {
      let orderData = null;
      if (activeOrderId) {
         orderData = await this.fetchOrderPayload(activeOrderId);
      }
      payloadStr = JSON.stringify({ 
        order: orderData,
        upiString: stateUpdate.upiString || null 
      });
    } else if (stateUpdate.state === "COMPLETION_VIEW") {
      payloadStr = JSON.stringify({ 
        message: stateUpdate.message || "Thank you for your order!" 
      });
      // In completion view, we might detach the active order ID or keep it for receipt printing.
    } else if (stateUpdate.state === "IDLE") {
      activeOrderId = null;
      payloadStr = null;
    }

    // Upsert the terminal session
    const [existing] = await db
      .select()
      .from(customerDisplaySessions)
      .where(eq(customerDisplaySessions.terminalId, terminalId))
      .limit(1);

    let sessionRow;
    if (existing) {
      [sessionRow] = await db
        .update(customerDisplaySessions)
        .set({
          displayState: stateUpdate.state,
          activeOrderId: activeOrderId ? BigInt(activeOrderId) : null,
          lastPayload: payloadStr,
          updatedAt: new Date(),
        })
        .where(eq(customerDisplaySessions.id, existing.id))
        .returning();
    } else {
      [sessionRow] = await db
        .insert(customerDisplaySessions)
        .values({
          terminalId,
          displayState: stateUpdate.state,
          activeOrderId: activeOrderId ? BigInt(activeOrderId) : null,
          lastPayload: payloadStr,
        })
        .returning();
    }

    return this.mapSession(sessionRow!);
  }

  private async fetchOrderPayload(orderId: number | string) {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, BigInt(orderId)))
      .limit(1);

    if (!order) return null;

    const items = await db
      .select({
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, BigInt(orderId)));

    return {
      orderId: Number(order.id),
      orderNumber: order.orderNumber,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      grandTotal: order.grandTotal,
      items,
    };
  }

  private mapSession(session: any) {
    let payloadObj = null;
    if (session.lastPayload) {
      try {
        payloadObj = JSON.parse(session.lastPayload);
      } catch (e) {}
    }

    return {
      terminalId: session.terminalId,
      displayState: session.displayState,
      activeOrderId: session.activeOrderId ? Number(session.activeOrderId) : null,
      payload: payloadObj,
    };
  }
}

export const customerDisplayService = new CustomerDisplayService();
