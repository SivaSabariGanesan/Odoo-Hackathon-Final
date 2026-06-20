import { api } from "./axios";

export interface Product {
  publicId: string;
  name: string;
  description: string | null;
  price: string;
  taxRate: string;
  isAvailable: boolean;
  categoryId: string;
  category: { publicId: string; name: string; color: string };
}

export interface CreateProductInput {
  name: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  price: number;
  taxRate?: number;
  description?: string;
  isAvailable?: boolean;
}

export async function fetchProducts(params?: {
  search?: string;
  categoryId?: string;
  isAvailable?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: Product[]; total: number }> {
  const { data } = await api.get("/products", { params });
  return { rows: data.data, total: data.meta?.total ?? data.data.length };
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data } = await api.post("/products", input);
  return data.data;
}

export async function updateProduct(
  publicId: string,
  input: Partial<CreateProductInput>,
): Promise<Product> {
  const { data } = await api.patch(`/products/${publicId}`, input);
  return data.data;
}

export async function deleteProduct(publicId: string): Promise<void> {
  await api.delete(`/products/${publicId}`);
}

export async function archiveProduct(publicId: string): Promise<void> {
  await api.post(`/products/${publicId}/archive`);
}

export async function bulkArchiveProducts(ids: string[]): Promise<void> {
  await api.post("/products/bulk/archive", { ids });
}

export async function bulkDeleteProducts(ids: string[]): Promise<{ deleted: number; blocked: string[] }> {
  const { data } = await api.post("/products/bulk/delete", { ids });
  return data.data;
}
