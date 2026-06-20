import { db } from "../db/index.ts";
import { floorTables } from "../db/schema/04_floor_tables.ts";
import { eq } from "drizzle-orm";

export class PosCoreStubsService {
  async resolveTableByToken(token: string) {
    const [table] = await db.select().from(floorTables).where(eq(floorTables.qrToken, token)).limit(1);
    return table || null;
  }

  async getOrCreateDraftForTable(tableId: string | number) { return { id: 1, grandTotal: "0.00" }; }
  async addItemToCart(orderId: number, dto: any) { return; }
  async updateCartItem(orderId: number, itemId: number, dto: any) { return; }
  async removeCartItem(orderId: number, itemId: number) { return; }
  async applyCoupon(orderId: number, code: string) { return; }
  async getEligiblePromotions(orderId: number) { return []; }
  async calculateTotals(orderId: number) { return { grandTotal: "0.00" }; }
  async sendToKitchen(orderId: number) { return; }
}

export const posCoreStubs = new PosCoreStubsService();
