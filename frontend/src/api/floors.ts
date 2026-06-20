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
}

export async function fetchFloors(): Promise<Floor[]> {
  const { data } = await api.get("/floors");
  return data.data;
}

export async function fetchTablesForFloor(floorPublicId: string): Promise<Table[]> {
  const { data } = await api.get(`/floors/${floorPublicId}/tables`);
  return data.data;
}
