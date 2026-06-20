/**
 * Self-Order API client
 *
 * The self-order flow:
 *  1. Customer scans a QR code that encodes a URL like:
 *       /self-order/splash?token=<tableToken>
 *  2. The splash page calls resolveTable(token) → gets back a
 *     short-lived sessionToken + tableId + tableNumber.
 *  3. The sessionToken is stored in sessionStorage under "soSessionToken"
 *     and the qr-token under "soTableToken".
 *  4. All subsequent calls pass { Authorization: Bearer <sessionToken> }
 *     AND the original tableToken in the URL path.
 */

import axios from "axios";

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1/self-order`
  : "/api/v1/self-order";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getSoSession(): { tableToken: string; sessionToken: string; tableId: string; tableNumber: string } | null {
  try {
    const tableToken   = sessionStorage.getItem("soTableToken");
    const sessionToken = sessionStorage.getItem("soSessionToken");
    const tableId      = sessionStorage.getItem("soTableId");
    const tableNumber  = sessionStorage.getItem("soTableNumber");
    if (!tableToken || !sessionToken || !tableId || !tableNumber) return null;
    return { tableToken, sessionToken, tableId, tableNumber };
  } catch {
    return null;
  }
}

export function setSoSession(data: { tableToken: string; sessionToken: string; tableId: string; tableNumber: string }) {
  sessionStorage.setItem("soTableToken",   data.tableToken);
  sessionStorage.setItem("soSessionToken", data.sessionToken);
  sessionStorage.setItem("soTableId",      data.tableId);
  sessionStorage.setItem("soTableNumber",  data.tableNumber);
}

export function clearSoSession() {
  sessionStorage.removeItem("soTableToken");
  sessionStorage.removeItem("soSessionToken");
  sessionStorage.removeItem("soTableId");
  sessionStorage.removeItem("soTableNumber");
}

function soApi(sessionToken: string) {
  return axios.create({
    baseURL: BASE,
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${sessionToken}`,
    },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SoCategory {
  publicId: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface SoProduct {
  publicId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  taxType: string;
  taxRate: string;
  uom: string;
  categoryId: string | null;
  isFeatured: boolean;
}

export interface SoCartItem {
  id: number | string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  notes?: string | null;
}

export interface SoCart {
  id: number | string;
  publicId: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  grandTotal: string;
  items: SoCartItem[];
  totals?: {
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
  };
}

export interface SoOrder {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: string;
  createdAt: string;
  items?: SoCartItem[];
}

// ─── Unauthenticated ─────────────────────────────────────────────────────────

export async function resolveTable(tableToken: string): Promise<{
  tableId: string;
  tableNumber: string;
  sessionToken: string;
  welcomeMessage: string | null;
}> {
  const { data } = await axios.get(`${BASE}/s/${tableToken}`);
  return data;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export async function fetchSoCategories(
  tableToken: string,
  sessionToken: string,
): Promise<SoCategory[]> {
  const { data } = await soApi(sessionToken).get(`/s/${tableToken}/menu/categories`);
  return data;
}

export async function fetchSoProducts(
  tableToken: string,
  sessionToken: string,
  params?: { category?: string; search?: string; page?: number; limit?: number },
): Promise<SoProduct[]> {
  const { data } = await soApi(sessionToken).get(`/s/${tableToken}/menu/products`, { params });
  return data;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export async function getSoCart(
  tableToken: string,
  sessionToken: string,
): Promise<SoCart> {
  const { data } = await soApi(sessionToken).get(`/s/${tableToken}/cart`);
  return data;
}

export async function addSoCartItem(
  tableToken: string,
  sessionToken: string,
  payload: { productId: string; quantity: number; notes?: string },
): Promise<void> {
  await soApi(sessionToken).post(`/s/${tableToken}/cart/items`, payload);
}

export async function updateSoCartItem(
  tableToken: string,
  sessionToken: string,
  itemId: string | number,
  quantity: number,
): Promise<void> {
  await soApi(sessionToken).patch(`/s/${tableToken}/cart/items/${itemId}`, { quantity });
}

export async function removeSoCartItem(
  tableToken: string,
  sessionToken: string,
  itemId: string | number,
): Promise<void> {
  await soApi(sessionToken).delete(`/s/${tableToken}/cart/items/${itemId}`);
}

// ─── Coupon ──────────────────────────────────────────────────────────────────

export async function applySoCoupon(
  tableToken: string,
  sessionToken: string,
  code: string,
): Promise<void> {
  await soApi(sessionToken).post(`/s/${tableToken}/coupon/apply`, { code });
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export async function soCheckout(
  tableToken: string,
  sessionToken: string,
): Promise<{ orderId: string | number; status: string }> {
  const { data } = await soApi(sessionToken).post(`/s/${tableToken}/checkout`);
  return data;
}

// ─── Order History ───────────────────────────────────────────────────────────

export async function getSoOrderHistory(
  tableToken: string,
  sessionToken: string,
): Promise<SoOrder[]> {
  const { data } = await soApi(sessionToken).get(`/s/${tableToken}/orders`);
  return data;
}
