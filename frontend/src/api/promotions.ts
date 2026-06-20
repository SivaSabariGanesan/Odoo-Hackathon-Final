import { api } from "./axios";

export type PromotionType =
  | "COUPON_PERCENTAGE"
  | "COUPON_FIXED"
  | "AUTO_PRODUCT_QTY"
  | "AUTO_ORDER_AMOUNT";

export type PromotionStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";

export interface Promotion {
  publicId: string;
  name: string;
  description: string | null;
  type: PromotionType;
  status: PromotionStatus;
  couponCode: string | null;
  discountValue: string;
  minOrderAmount: string | null;
  triggerProductId: string | null;
  triggerQty: number | null;
  maxUses: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> { success: true; data: T }

export async function listPromotions(params?: {
  search?: string;
  type?: PromotionType;
  status?: PromotionStatus;
  page?: number;
  pageSize?: number;
}): Promise<Promotion[]> {
  const { data } = await api.get<ApiResponse<Promotion[]>>("/promotions", { params });
  return data.data;
}

export async function getPromotion(publicId: string): Promise<Promotion> {
  const { data } = await api.get<ApiResponse<Promotion>>(`/promotions/${publicId}`);
  return data.data;
}

export async function createPromotion(input: {
  name: string;
  description?: string;
  type: PromotionType;
  status?: PromotionStatus;
  couponCode?: string;
  discountValue: number;
  minOrderAmount?: number;
  triggerProductId?: string;
  triggerQty?: number;
  maxUses?: number;
  startsAt?: string;
  expiresAt?: string;
}): Promise<Promotion> {
  const { data } = await api.post<ApiResponse<Promotion>>("/promotions", input, {
    validateStatus: (s) => s === 200 || s === 201,
  });
  return data.data;
}

export async function updatePromotion(
  publicId: string,
  input: Partial<{
    name: string;
    description: string;
    status: PromotionStatus;
    couponCode: string;
    discountValue: number;
    minOrderAmount: number;
    triggerProductId: string;
    triggerQty: number;
    maxUses: number;
    startsAt: string;
    expiresAt: string;
  }>,
): Promise<Promotion> {
  const { data } = await api.patch<ApiResponse<Promotion>>(`/promotions/${publicId}`, input);
  return data.data;
}

export async function deletePromotion(publicId: string): Promise<void> {
  await api.delete(`/promotions/${publicId}`);
}

export async function togglePromotion(publicId: string): Promise<Promotion> {
  const { data } = await api.patch<ApiResponse<Promotion>>(`/promotions/${publicId}/toggle`);
  return data.data;
}
