import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { floors, floorTables, orders } from "../db/schema/index.ts";
import { emit } from "../utils/events.ts";

// ─── Input types (mirrored from validators) ───────────────────────────────────

export interface CreateFloorInput {
  name: string;
  sortOrder?: number;
}

export interface UpdateFloorInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateTableInput {
  floorId: string;
  tableNumber: string;
  seats?: number;
  posX?: number;
  posY?: number;
}

export interface UpdateTableInput {
  tableNumber?: string;
  seats?: number;
  posX?: number;
  posY?: number;
  isActive?: boolean;
}

// ─── Floors ───────────────────────────────────────────────────────────────────

export async function listFloors() {
  return db.query.floors.findMany({
    where: eq(floors.isActive, true),
    orderBy: [floors.sortOrder, floors.name],
    with: {
      tables: {
        where: eq(floorTables.isActive, true),
        orderBy: [floorTables.tableNumber],
      },
    },
  });
}

export async function getFloorById(publicId: string) {
  return db.query.floors.findFirst({
    where: eq(floors.publicId, publicId),
    with: { tables: { where: eq(floorTables.isActive, true) } },
  });
}

export async function createFloor(input: CreateFloorInput) {
  const [floor] = await db.insert(floors).values({
    name: input.name,
    sortOrder: input.sortOrder ?? 0,
  }).returning();
  return floor;
}

export async function updateFloor(publicId: string, input: UpdateFloorInput) {
  const [updated] = await db.update(floors)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(floors.publicId, publicId))
    .returning();
  return updated ?? null;
}

export async function deleteFloor(publicId: string) {
  const existing = await db.query.floors.findFirst({
    where: eq(floors.publicId, publicId),
    with: { tables: { where: eq(floorTables.isActive, true), columns: { id: true } } },
  });
  if (!existing) return { found: false };
  if (existing.tables && existing.tables.length > 0) {
    return { found: true, blocked: true, reason: "Floor has active tables" };
  }
  await db.delete(floors).where(eq(floors.publicId, publicId));
  return { found: true, blocked: false };
}

// ─── Tables ───────────────────────────────────────────────────────────────────

/**
 * Derived occupied status: a table is occupied if it has an open DRAFT order.
 */
async function getOccupiedTableIds(): Promise<Set<string>> {
  const rows = await db
    .select({ tableId: orders.tableId })
    .from(orders)
    .where(and(eq(orders.status, "DRAFT"), sql`${orders.tableId} IS NOT NULL`));
  return new Set(rows.map((r) => String(r.tableId)));
}

export async function listTablesForFloor(floorPublicId: string) {
  const floor = await db.query.floors.findFirst({ where: eq(floors.publicId, floorPublicId) });
  if (!floor) return null;

  const tables = await db.query.floorTables.findMany({
    where: and(eq(floorTables.floorId, floor.id), eq(floorTables.isActive, true)),
    orderBy: [floorTables.tableNumber],
  });

  const occupied = await getOccupiedTableIds();
  return tables.map((t) => ({ ...t, isOccupied: occupied.has(String(t.id)) }));
}

export async function getTableById(publicId: string) {
  const table = await db.query.floorTables.findFirst({
    where: eq(floorTables.publicId, publicId),
    with: { floor: true },
  });
  if (!table) return null;

  const occupied = await getOccupiedTableIds();
  return { ...table, isOccupied: occupied.has(String(table.id)) };
}

export async function createTable(input: CreateTableInput) {
  const floor = await db.query.floors.findFirst({
    where: eq(floors.publicId, input.floorId),
  });
  if (!floor) return { error: "FLOOR_NOT_FOUND" as const };

  const [table] = await db.insert(floorTables).values({
    floorId: floor.id,
    tableNumber: input.tableNumber,
    seats: input.seats ?? 4,
    posX: input.posX ?? 0,
    posY: input.posY ?? 0,
  }).returning();

  return { table };
}

export async function updateTable(publicId: string, input: UpdateTableInput) {
  const existing = await db.query.floorTables.findFirst({
    where: eq(floorTables.publicId, publicId),
  });
  if (!existing) return { found: false as const };

  const [updated] = await db.update(floorTables)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(floorTables.publicId, publicId))
    .returning();

  return { found: true, table: updated };
}

export async function toggleTableActive(publicId: string) {
  const existing = await db.query.floorTables.findFirst({
    where: eq(floorTables.publicId, publicId),
  });
  if (!existing) return { found: false as const };

  const [updated] = await db.update(floorTables)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(eq(floorTables.publicId, publicId))
    .returning();

  return { found: true, table: updated };
}

export async function deleteTable(publicId: string) {
  const existing = await db.query.floorTables.findFirst({
    where: eq(floorTables.publicId, publicId),
    with: { orders: { where: eq(orders.status, "DRAFT"), columns: { id: true } } },
  });
  if (!existing) return { found: false };
  if (existing.orders && existing.orders.length > 0) {
    return { found: true, blocked: true, reason: "Table has an open order" };
  }

  await db.update(floorTables)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(floorTables.publicId, publicId));

  return { found: true, blocked: false };
}

/**
 * Resolves a floor_tables.qrToken to a full table record.
 * Called by KO's self-order routes.
 */
export async function resolveTableByToken(token: string) {
  return db.query.floorTables.findFirst({
    where: and(eq(floorTables.qrToken, token), eq(floorTables.isActive, true)),
    with: { floor: true },
  });
}

/**
 * Fires table_occupancy_changed event. Called internally when an order is
 * created or closed/paid for a table.
 */
export async function emitTableOccupancyChanged(tableId: bigint, isOccupied: boolean) {
  const table = await db.query.floorTables.findFirst({
    where: eq(floorTables.id, tableId),
    with: { floor: true },
  });
  if (!table) return;

  emit("table_occupancy_changed", {
    tableId: table.publicId,
    tableNumber: table.tableNumber,
    floorId: (table as any).floor?.publicId,
    floorName: (table as any).floor?.name,
    isOccupied,
  });
}
