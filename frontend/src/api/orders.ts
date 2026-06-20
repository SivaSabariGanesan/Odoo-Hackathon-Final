import { api } from "./axios";

export interface Order {
  publicId: string;
  orderNumber: string;
  status: string;
  type: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  grandTotal: string;
}

interface ApiResponse<T> { success: true; data: T }

export async function createOrder(payload: {
  type?: "DINE_IN" | "TAKEAWAY";
  source?: "POS" | "SELF_ORDER";
  guestName?: string;
}): Promise<Order> {
  const { data } = await api.post<ApiResponse<Order>>("/orders", payload);
  return data.data;
}

export async function addItemToOrder(
  orderId: string,
  productId: string,
  quantity: number
): Promise<Order> {
  const { data } = await api.post<ApiResponse<Order>>(`/orders/${orderId}/items`, {
    productId,
    quantity,
  });
  return data.data;
}

export async function markOrderReady(orderId: string): Promise<Order> {
  const { data } = await api.post<ApiResponse<Order>>(`/orders/${orderId}/mark-ready`);
  return data.data;
}
