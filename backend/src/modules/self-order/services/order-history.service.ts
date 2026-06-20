import { db } from "../../../db/index.ts";
import { orders, orderItems } from "../../../db/schema/08_orders.ts";
import { eq, and, desc } from "drizzle-orm";
import { mappingService } from "./mapping.service.ts";

export class OrderHistoryService {
  async getOrderHistory(tableId: string | number) {
    const list = await db
      .select({
        id: orders.id,
        publicId: orders.publicId,
        orderNumber: orders.orderNumber,
        status: orders.status,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.tableId, BigInt(tableId)), eq(orders.source, "SELF_ORDER")))
      .orderBy(desc(orders.createdAt));

    return list.map(o => ({
      ...o,
      customerStatus: mappingService.mapOrderStatusToCustomerFacing(o.status),
      id: undefined // hide internal ID
    }));
  }

  async getOrderDetail(tableId: string | number, orderPublicId: string) {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tableId, BigInt(tableId)), eq(orders.publicId, orderPublicId)))
      .limit(1);

    if (!order) return null;

    const items = await db
      .select({
        id: orderItems.publicId,
        productName: orderItems.productName,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        lineTotal: orderItems.lineTotal,
        kitchenState: orderItems.kitchenState,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    return {
      publicId: order.publicId,
      orderNumber: order.orderNumber,
      status: order.status,
      customerStatus: mappingService.mapOrderStatusToCustomerFacing(order.status),
      grandTotal: order.grandTotal,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      createdAt: order.createdAt,
      items
    };
  }
}

export const orderHistoryService = new OrderHistoryService();
