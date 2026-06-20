import { api } from "./axios";

export type OrderStatus = "DRAFT" | "SENT_TO_KITCHEN" | "PREPARING" | "READY" | "PAID" | "CANCELLED";
export type OrderType   = "DINE_IN" | "TAKEAWAY";
export type OrderSource = "POS" | "SELF_ORDER";

export interface OrderItem {
  publicId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  notes: string | null;
  kitchenState: string | null;
  product?: { publicId: string; name?: string; imageUrl?: string | null };
}

/** Resolve the product's public UUID from an order line (API may nest it under `product`). */
export function orderItemProductPublicId(item: OrderItem): string {
  return item.product?.publicId ?? item.productId;
}

export function findOrderItemForProduct(order: Order, productPublicId: string): OrderItem | undefined {
  return order.items?.find(i => orderItemProductPublicId(i) === productPublicId);
}

export interface Order {
  publicId: string;
  orderNumber: string;
  status: OrderStatus;
  type: OrderType;
  source: OrderSource;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  grandTotal: string;
  guestName: string | null;
  createdAt?: string;
  updatedAt?: string;
  table?: { publicId: string; tableNumber: string } | null;
  customer?: { publicId: string; name: string; email: string | null } | null;
  items?: OrderItem[];
}

interface ApiResponse<T> { success: true; data: T }

export async function listOrders(params?: {
  sessionId?: string;
  tableId?: string;
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}): Promise<Order[]> {
  const { data } = await api.get<ApiResponse<Order[]>>("/orders", { params });
  return data.data;
}

export async function getOrder(publicId: string): Promise<Order> {
  const { data } = await api.get<ApiResponse<Order>>(`/orders/${publicId}`);
  return data.data;
}

export async function createOrder(payload: {
  tableId?: string;
  sessionId?: string;
  customerId?: string;
  type?: OrderType;
  source?: OrderSource;
  guestName?: string;
}): Promise<Order> {
  const { data } = await api.post<ApiResponse<Order>>("/orders", payload, {
    validateStatus: (s) => s === 200 || s === 201,
  });
  return data.data;
}

export async function getOrCreateDraftForTable(tableId: string): Promise<Order> {
  const { data } = await api.post<ApiResponse<Order>>(`/orders/table/${tableId}/draft`);
  return data.data;
}

export async function addItemToOrder(
  orderId: string,
  productId: string,
  quantity: number,
  notes?: string,
): Promise<Order> {
  const { data } = await api.post<ApiResponse<Order>>(`/orders/${orderId}/items`, {
    productId,
    quantity,
    notes,
  });
  return data.data;
}

export async function updateOrderItem(
  orderId: string,
  itemId: string,
  quantity: number,
): Promise<Order> {
  const { data } = await api.patch<ApiResponse<Order>>(`/orders/${orderId}/items/${itemId}`, {
    quantity,
  });
  return data.data;
}

export async function removeOrderItem(orderId: string, itemId: string): Promise<Order> {
  const { data } = await api.delete<ApiResponse<Order>>(`/orders/${orderId}/items/${itemId}`);
  return data.data;
}

export async function applyCoupon(orderId: string, code: string): Promise<Order> {
  const { data } = await api.post<ApiResponse<Order>>(`/orders/${orderId}/coupon`, { code });
  return data.data;
}

export async function sendToKitchen(orderId: string): Promise<unknown> {
  const { data } = await api.post(`/orders/${orderId}/send-to-kitchen`);
  return data.data;
}

export async function cancelOrder(orderId: string, reason?: string): Promise<Order> {
  const { data } = await api.post<ApiResponse<Order>>(`/orders/${orderId}/cancel`, { reason });
  return data.data;
}

export async function attachCustomer(
  orderId: string,
  customerPublicId: string | null,
): Promise<Order> {
  const { data } = await api.post<ApiResponse<Order>>(`/orders/${orderId}/attach-customer`, {
    customerPublicId,
  });
  return data.data;
}

export async function markOrderPaid(
  orderId: string,
  payload: { methodId: string; amount: number; transactionRef?: string },
): Promise<{ paid: boolean }> {
  const { data } = await api.post<ApiResponse<{ paid: boolean }>>(
    `/orders/${orderId}/payments`,
    payload,
  );
  return data.data;
}

export async function getOrderReceipt(
  orderId: string,
): Promise<{ receiptNumber: string; payload: unknown }> {
  const { data } = await api.get<ApiResponse<{ receiptNumber: string; payload: unknown }>>(
    `/orders/${orderId}/receipt`,
  );
  return data.data;
}

export async function emailOrderReceipt(orderId: string, email: string): Promise<void> {
  await api.post(`/orders/${orderId}/receipt/email`, { email });
}
