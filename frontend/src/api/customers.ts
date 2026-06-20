import { api } from "./axios";

export interface Customer {
  publicId: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export async function fetchCustomers(params?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<Customer[]> {
  const { data } = await api.get("/customers", { params });
  return data.data;
}

export async function createCustomer(input: {
  name: string;
  email?: string;
  phone?: string;
}): Promise<Customer> {
  const { data } = await api.post("/customers", input, {
    validateStatus: (s) => s === 200 || s === 201,
  });
  return data.data;
}

export async function updateCustomer(
  publicId: string,
  input: { name?: string; email?: string; phone?: string },
): Promise<Customer> {
  const { data } = await api.patch(`/customers/${publicId}`, input);
  return data.data;
}

export async function deleteCustomer(publicId: string): Promise<void> {
  await api.delete(`/customers/${publicId}`);
}
