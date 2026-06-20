import { api } from "./axios";

export interface CustomerUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface CustomerAuthResponse {
  customer: CustomerUser;
  accessToken: string;
}

export interface CustomerRegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface CustomerLoginPayload {
  email: string;
  password: string;
}

export async function customerRegister(
  payload: CustomerRegisterPayload,
): Promise<CustomerAuthResponse> {
  const { data } = await api.post("/v1/customer/auth/register", payload, {
    validateStatus: (s) => s === 200 || s === 201,
  });
  return data.data;
}

export async function customerLogin(
  payload: CustomerLoginPayload,
): Promise<CustomerAuthResponse> {
  const { data } = await api.post("/v1/customer/auth/login", payload);
  return data.data;
}

export async function getCustomerMe(token: string) {
  const { data } = await api.get("/v1/customer/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
}

export async function requestReceiptEmail(
  orderPublicId: string,
  email?: string,
): Promise<{ sent: boolean; to: string; receiptNumber: string }> {
  const { data } = await api.post(`/v1/customer/orders/${orderPublicId}/receipt`, {
    email,
  });
  return data.data;
}
