import { api } from "./axios";

// ── Types ─────────────────────────────────────────────────────────

export type PaymentMethodType = "CASH" | "CARD" | "CASHFREE";

export interface PaymentMethod {
  publicId: string;
  name: string;
  type: PaymentMethodType;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CashfreeConfig {
  environment: "SANDBOX" | "PRODUCTION";
  isEnabled: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasWebhookSecret: boolean;
}

export interface PaymentTransaction {
  transactionId: string;
  orderId: string;
  paymentMethodId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  amount: number;
  createdAt: string;
}

export interface CashPaymentResult {
  transactionId: string;
  status: "SUCCESS";
  change: number;
}

export interface CashfreePaymentResult {
  transactionId: string;
  cashfreeOrderId: string;
  paymentSessionId: string;
  environment: "SANDBOX" | "PRODUCTION";
}

// ── API Response Wrappers ─────────────────────────────────────────

interface ApiResponse<T> {
  success: true;
  data: T;
}

// ── Payment Methods ───────────────────────────────────────────────

export async function listPaymentMethods(params?: { isEnabled?: boolean }): Promise<PaymentMethod[]> {
  const { data } = await api.get<ApiResponse<PaymentMethod[]>>("/v1/payment-methods", { params });
  return data.data;
}

export async function createPaymentMethod(payload: {
  name: string;
  type: PaymentMethodType;
  isEnabled: boolean;
}): Promise<PaymentMethod> {
  const { data } = await api.post<ApiResponse<PaymentMethod>>("/v1/payment-methods", payload);
  return data.data;
}

export async function updatePaymentMethod(
  publicId: string,
  payload: { name?: string; isEnabled?: boolean }
): Promise<PaymentMethod> {
  const { data } = await api.patch<ApiResponse<PaymentMethod>>(`/v1/payment-methods/${publicId}`, payload);
  return data.data;
}

export async function deletePaymentMethod(publicId: string): Promise<void> {
  await api.delete(`/v1/payment-methods/${publicId}`);
}

export async function enablePaymentMethod(publicId: string): Promise<PaymentMethod> {
  const { data } = await api.patch<ApiResponse<PaymentMethod>>(`/v1/payment-methods/${publicId}/enable`);
  return data.data;
}

export async function disablePaymentMethod(publicId: string): Promise<PaymentMethod> {
  const { data } = await api.patch<ApiResponse<PaymentMethod>>(`/v1/payment-methods/${publicId}/disable`);
  return data.data;
}

// ── Cashfree Config ───────────────────────────────────────────────

export async function getCashfreeConfig(): Promise<CashfreeConfig> {
  const { data } = await api.get<ApiResponse<CashfreeConfig>>("/v1/payment-providers/cashfree");
  return data.data;
}

export async function updateCashfreeConfig(payload: {
  clientId?: string;
  clientSecret?: string;
  webhookSecret?: string;
  environment?: "SANDBOX" | "PRODUCTION";
  isEnabled?: boolean;
}): Promise<CashfreeConfig> {
  const { data } = await api.patch<ApiResponse<CashfreeConfig>>("/v1/payment-providers/cashfree", payload);
  return data.data;
}

// ── Payment Processing ────────────────────────────────────────────

export async function createPaymentOrder(
  orderId: string,
  paymentMethodId: string
): Promise<PaymentTransaction> {
  const { data } = await api.post<ApiResponse<PaymentTransaction>>(`/v1/orders/${orderId}/payment-order`, {
    paymentMethodId,
  });
  return data.data;
}

export async function processCashPayment(
  orderId: string,
  transactionId: string,
  cashReceived: number
): Promise<CashPaymentResult> {
  const { data } = await api.post<ApiResponse<CashPaymentResult>>(
    `/v1/orders/${orderId}/payments/cash`,
    { transactionId, receivedAmount: cashReceived }
  );
  return data.data;
}

export async function processCardPayment(
  orderId: string,
  transactionId: string,
  cardTransactionRef: string
): Promise<CardPaymentResult> {
  const { data } = await api.post<ApiResponse<CardPaymentResult>>(
    `/v1/orders/${orderId}/payments/card`,
    { transactionId, transactionReference: cardTransactionRef }
  );
  return data.data;
}

export interface CardPaymentResult {
  transactionId: string;
  status: "SUCCESS";
}

export async function initiateCashfreePayment(
  orderId: string,
  transactionId: string
): Promise<CashfreePaymentResult> {
  const { data } = await api.post<ApiResponse<CashfreePaymentResult>>(
    `/v1/orders/${orderId}/payments/cashfree`,
    { transactionId }
  );
  return data.data;
}
