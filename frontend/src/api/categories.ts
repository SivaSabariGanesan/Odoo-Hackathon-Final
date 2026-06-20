import { api } from "./axios";

export interface Category {
  publicId: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get("/categories");
  return data.data;
}

export async function createCategory(input: { name: string; color?: string; sortOrder?: number }): Promise<Category> {
  const { data } = await api.post("/categories", input);
  return data.data;
}

export async function updateCategory(
  publicId: string,
  input: Partial<{ name: string; color: string; sortOrder: number; isActive: boolean }>,
): Promise<Category> {
  const { data } = await api.patch(`/categories/${publicId}`, input);
  return data.data;
}

export async function deleteCategory(publicId: string): Promise<void> {
  await api.delete(`/categories/${publicId}`);
}
