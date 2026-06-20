import { api } from "./axios";

export type StaffRole   = "ADMIN" | "CASHIER" | "KITCHEN";
export type StaffStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface StaffMember {
  publicId: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  status: StaffStatus;
  avatarUrl: string | null;
}

export async function fetchStaff(params?: {
  role?: StaffRole;
  status?: StaffStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<StaffMember[]> {
  const { data } = await api.get("/staff", { params });
  return data.data;
}

export async function createStaff(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: StaffRole;
  pin?: string;
}): Promise<StaffMember> {
  const { data } = await api.post("/staff", input, {
    validateStatus: (s) => s === 200 || s === 201,
  });
  return data.data;
}

export async function updateStaff(
  publicId: string,
  input: { name?: string; phone?: string; role?: StaffRole },
): Promise<StaffMember> {
  const { data } = await api.patch(`/staff/${publicId}`, input);
  return data.data;
}

export async function archiveStaff(publicId: string): Promise<StaffMember> {
  const { data } = await api.post(`/staff/${publicId}/archive`);
  return data.data;
}

export async function deleteStaff(publicId: string): Promise<void> {
  await api.delete(`/staff/${publicId}`);
}

export async function changeStaffPassword(
  publicId: string,
  newPassword: string,
): Promise<void> {
  await api.post(`/staff/${publicId}/change-password`, { newPassword });
}
