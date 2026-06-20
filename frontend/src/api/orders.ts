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
  lineTotal: string;
  notes: string | null;
  kitchenState: string | null;
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
  paidAt: string | null;
  createdAt: string;
  items?: OrderItem[];
  table?: { publicId: string; tableNumber: string } | null;
  customer?: { publicId: string; name: string; email: string | null } | null;
}

export async function fetchOrders(params?: {
  sessionId?: string;
  tableId?: string;
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}): Promise<Order[]> {
  const { data } = await api.get("/orders", { params });
  return data.data;
}

export async function fetchOrder(publicId: string): Promise<Order> {
  const { data } = await api.get(`/orders/${publicId}`);
  return data.data;
}

export async function createOrder(input: {
  tableId?: string;
  sessionId?: string;
  customerId?: string;
  source?: OrderSource;
  type?: OrderType;
  guestName?: string;
}): Promise<Order> {
  const { data } = await api.post("/orders", input, {
    validateStatus: (s) => s === 200 || s === 201,
  });
  return data.data;
}

export async function getOrCreateDraftForTable(tablePublicId: string): Promise<Order> {
  const { data } = await api.post(`/orders/table/${tablePublicId}/draft`);
  return data.data;
}

export async function addItemToOrder(
  orderPublicId: string,
  input: { productId: string; quantity: number; notes?: string },
): Promise<Order> {
  const { data } = await api.post(`/orders/${orderPublicId}/items`, input);
  return data.data;
}

export async function updateOrderItem(
  orderPublicId: string,
  itemPublicId: string,
  quantity: number,
): Promise<Order> {
  const { data } = await api.patch(`/orders/${orderPublicId}/items/${itemPublicId}`, { quantity });
  return data.data;
}

export async function removeOrderItem(
  orderPublicId: string,
  itemPublicId: string,
): Promise<Order> {
  const { data } = await api.delete(`/orders/${orderPublicId}/items/${itemPublicId}`);
  return data.data;
}

export async function applyCouponToOrder(
  orderPublicId: string,
  code: string,
): Promise<Order> {
  const { data } = await api.post(`/orders/${orderPublicId}/coupon`, { code });
  return data.data;
}

export async function sendOrderToKitchen(orderPublicId: string): Promise<void> {
  await api.post(`/orders/${orderPublicId}/send-to-kitchen`);
}

export async function cancelOrder(orderPublicId: string, reason?: string): Promise<Order> {
  const { data } = await api.post(`/orders/${orderPublicId}/cancel`, { reason });
  return data.data;
}

export async function attachCustomerToOrder(
  orderPublicId: string,
  customerPublicId: string | null,
): Promise<Order> {
  const { data } = await api.post(`/orders/${orderPublicId}/attach-customer`, {
    customerPublicId,
  });
  return data.data;
}

export async function markOrderPaid(
  orderPublicId: string,
  input?: { methodId?: string; amount?: number; transactionRef?: string },
): Promise<void> {
  await api.post(`/orders/${orderPublicId}/mark-paid`, input ?? {});
}
