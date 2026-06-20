import { api } from "./axios";

export type ReportPeriod = "today" | "week" | "month" | "custom";

interface ApiResponse<T> { success: true; data: T }

export interface KpiData {
  totalOrders: number;
  revenue: string;
  avgOrderValue: string;
}

export interface SalesTrendPoint {
  period: string;
  order_count: number;
  revenue: string;
}

export interface TopCategory {
  category_id: string;
  category_name: string;
  color: string;
  order_count: number;
  total_qty: number;
  revenue: string;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  category_name: string;
  quantity_sold: number;
  revenue: string;
}

export interface TopOrder {
  public_id: string;
  order_number: string;
  grand_total: string;
  paid_at: string | null;
  type: string;
  staff_name: string | null;
  table_number: string | null;
}

export interface ReportParams {
  period?: ReportPeriod;
  from?: string;
  to?: string;
  staffId?: string;
  sessionId?: string;
}

export async function fetchKpis(params?: ReportParams): Promise<KpiData> {
  const { data } = await api.get<ApiResponse<KpiData>>("/reports/kpis", { params });
  return data.data;
}

export async function fetchSalesTrend(
  params?: Pick<ReportParams, "period" | "from" | "to">,
): Promise<SalesTrendPoint[]> {
  const { data } = await api.get<ApiResponse<SalesTrendPoint[]>>("/reports/sales-trend", {
    params,
  });
  return data.data;
}

export async function fetchTopCategories(
  params?: Pick<ReportParams, "period" | "from" | "to">,
): Promise<TopCategory[]> {
  const { data } = await api.get<ApiResponse<TopCategory[]>>("/reports/top-categories", {
    params,
  });
  return data.data;
}

export async function fetchTopProducts(
  params?: Pick<ReportParams, "period" | "from" | "to"> & { productId?: string },
): Promise<TopProduct[]> {
  const { data } = await api.get<ApiResponse<TopProduct[]>>("/reports/top-products", { params });
  return data.data;
}

export async function fetchTopOrders(
  params?: Pick<ReportParams, "period" | "from" | "to">,
): Promise<TopOrder[]> {
  const { data } = await api.get<ApiResponse<TopOrder[]>>("/reports/top-orders", { params });
  return data.data;
}

export async function exportReport(params: {
  period?: ReportPeriod;
  from?: string;
  to?: string;
  type: "orders" | "products" | "categories";
}): Promise<unknown[]> {
  const { data } = await api.get<ApiResponse<unknown[]>>("/reports/export", { params });
  return data.data;
}
