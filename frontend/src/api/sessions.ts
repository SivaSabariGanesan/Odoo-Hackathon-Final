import { api } from "./axios";

export interface Session {
  publicId: string;
  status: "OPEN" | "CLOSED";
  openingCash: string;
  closingCash: string | null;
  closingSaleAmount: string | null;
  openedAt: string;
  closedAt: string | null;
  openedBy: { publicId: string; name: string } | null;
}

export async function fetchLastClosedSession(): Promise<Session | null> {
  const { data } = await api.get("/sessions/last-closed");
  return data.data;
}

export async function openSession(openingCash?: number): Promise<Session> {
  const { data } = await api.post("/sessions/open", { openingCash: openingCash ?? 0 });
  return data.data;
}

export async function closeSession(
  sessionPublicId: string,
  closingCash?: number,
): Promise<{ session: Session; summary: { totalSales: string; paidOrderCount: number } }> {
  const { data } = await api.post(`/sessions/${sessionPublicId}/close`, { closingCash });
  return data.data;
}
