import { api } from "./axios";

export type KdsItemState = "TO_COOK" | "PREPARING" | "COMPLETED";
export type TicketStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface KdsTicketItem {
  publicId: string;
  productName: string;
  quantity: number;
  state: KdsItemState;
  notes: string | null;
}

export interface KdsTicket {
  publicId: string;
  ticketNumber: number;
  status: TicketStatus;
  tableLabel: string | null;
  orderType: string | null;
  items: KdsTicketItem[];
}

interface ApiResponse<T> { success: true; data: T }

export async function listActiveTickets(params?: {
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<KdsTicket[]> {
  const { data } = await api.get<ApiResponse<KdsTicket[]>>("/kds/tickets", { params });
  return data.data;
}

export async function getTicketsByOrder(orderPublicId: string): Promise<KdsTicket[]> {
  const { data } = await api.get<ApiResponse<KdsTicket[]>>(
    `/kds/tickets/order/${orderPublicId}`,
  );
  return data.data;
}

export async function advanceTicketItem(itemPublicId: string): Promise<KdsTicketItem> {
  const { data } = await api.post<ApiResponse<KdsTicketItem>>(
    `/kds/items/${itemPublicId}/advance`,
  );
  return data.data;
}

export async function advanceTicket(ticketPublicId: string): Promise<KdsTicket> {
  const { data } = await api.post<ApiResponse<KdsTicket>>(
    `/kds/tickets/${ticketPublicId}/advance`,
  );
  return data.data;
}
