import { api } from "./axios";

export interface PromotionResult {
  publicId: string;
  name: string;
  type: string;
  discountValue: string;
  calculatedDiscount: number;
}

export async function validateCoupon(
  code: string,
  orderId: string,
): Promise<PromotionResult> {
  const { data } = await api.post("/coupons/validate", { code, orderId });
  return data.data;
}

export async function getEligibleCoupons(orderId: string): Promise<PromotionResult[]> {
  const { data } = await api.get(`/coupons/eligible/${orderId}`);
  return data.data;
}
