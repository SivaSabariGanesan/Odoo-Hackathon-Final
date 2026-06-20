import { api } from "./axios";

export interface Floor {
  publicId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  tables: Table[];
}

export interface Table {
  publicId: string;
  tableNumber: string;
  seats: number;
  isActive: boolean;
  isOccupied?: boolean;
  posX: number;
  posY: number;
  qrToken?: string;
}

interface ApiResponse<T> { success: true; data: T }

export async function fetchFloors(): Promise<Floor[]> {
  const { data } = await api.get<ApiResponse<Floor[]>>("/floors");
  return data.data;
}

export async function createFloor(input: { name: string; sortOrder?: number }): Promise<Floor> {
  const { data } = await api.post<ApiResponse<Floor>>("/floors", input, {
    validateStatus: (s) => s === 200 || s === 201,
  });
  return data.data;
}

export async function updateFloor(
  publicId: string,
  input: { name?: string; sortOrder?: number; isActive?: boolean },
): Promise<Floor> {
  const { data } = await api.patch<ApiResponse<Floor>>(`/floors/${publicId}`, input);
  return data.data;
}

export async function deleteFloor(publicId: string): Promise<void> {
  await api.delete(`/floors/${publicId}`);
}

export async function fetchTablesForFloor(floorPublicId: string): Promise<Table[]> {
  const { data } = await api.get<ApiResponse<Table[]>>(`/floors/${floorPublicId}/tables`);
  return data.data;
}

export async function createTable(input: {
  floorId: string;
  tableNumber: string;
  seats?: number;
  posX?: number;
  posY?: number;
}): Promise<Table> {
  const { data } = await api.post<ApiResponse<Table>>("/floors/tables", input, {
    validateStatus: (s) => s === 200 || s === 201,
  });
  return data.data;
}

export async function updateTable(
  publicId: string,
  input: { tableNumber?: string; seats?: number; isActive?: boolean; posX?: number; posY?: number },
): Promise<Table> {
  const { data } = await api.patch<ApiResponse<Table>>(`/floors/tables/${publicId}`, input);
  return data.data;
}

export async function deleteTable(publicId: string): Promise<void> {
  await api.delete(`/floors/tables/${publicId}`);
}

export async function toggleTableActive(publicId: string): Promise<Table> {
  const { data } = await api.post<ApiResponse<Table>>(`/floors/tables/${publicId}/toggle-active`);
  return data.data;
}
