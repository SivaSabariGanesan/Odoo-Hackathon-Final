import { api } from "./axios";

export interface Category {
  publicId: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  publicId: string;
  name: string;
  price: string;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  taxRate?: number;
  taxType?: string;
  category?: Category;
  categoryId?: string;
}

interface ApiResponse<T> { success: true; data: T }

// ── Categories ────────────────────────────────────────────────────

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<ApiResponse<Category[]>>("/categories");
  return data.data;
}

export async function createCategory(payload: { name: string; color?: string }): Promise<Category> {
  const { data } = await api.post<ApiResponse<Category>>("/categories", payload);
  return data.data;
}

export async function updateCategory(publicId: string, payload: { name?: string; color?: string }): Promise<Category> {
  const { data } = await api.patch<ApiResponse<Category>>(`/categories/${publicId}`, payload);
  return data.data;
}

export async function deleteCategory(publicId: string): Promise<void> {
  await api.delete(`/categories/${publicId}`);
}

// ── Products ──────────────────────────────────────────────────────

export async function listProducts(params?: { categoryId?: string; isAvailable?: boolean; search?: string }): Promise<Product[]> {
  const { data } = await api.get<ApiResponse<Product[]>>("/products", { params });
  return data.data;
}

export async function createProduct(payload: {
  name: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  price: number;
  taxRate?: number;
  taxType?: string;
  description?: string;
  isAvailable?: boolean;
}): Promise<Product> {
  const { data } = await api.post<ApiResponse<Product>>("/products", payload);
  return data.data;
}

export async function updateProduct(publicId: string, payload: {
  name?: string;
  categoryId?: string;
  price?: number;
  taxRate?: number;
  description?: string;
  isAvailable?: boolean;
}): Promise<Product> {
  const { data } = await api.patch<ApiResponse<Product>>(`/products/${publicId}`, payload);
  return data.data;
}

export async function deleteProduct(publicId: string): Promise<void> {
  await api.delete(`/products/${publicId}`);
}

export async function archiveProduct(publicId: string): Promise<Product> {
  const { data } = await api.post<ApiResponse<Product>>(`/products/${publicId}/archive`);
  return data.data;
}

export async function bulkArchiveProducts(ids: string[]): Promise<void> {
  await api.post("/products/bulk/archive", { ids });
}

export async function bulkDeleteProducts(ids: string[]): Promise<void> {
  await api.post("/products/bulk/delete", { ids });
}
