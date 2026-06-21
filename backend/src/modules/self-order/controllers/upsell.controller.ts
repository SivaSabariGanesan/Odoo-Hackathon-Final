import { Context } from "hono";
import { posCoreStubs } from "../../../services/pos-core-stubs.ts";
import { upsellService } from "../services/upsell.service.ts";
import { calculateTotals, getOrCreateDraftForTable } from "../../../services/order.service.ts";

export async function getUpsellSuggestions(c: Context) {
  try {
    const token = c.req.param("token");
    if (!token) {
      return c.json({ success: false, error: "Missing token parameter" }, 400);
    }

    // 1. Resolve table
    const table = await posCoreStubs.resolveTableByToken(token);
    if (!table) {
      return c.json({ success: false, error: { message: "Invalid QR token" } }, 404);
    }

    // 2. Resolve draft order
    const draftState = await getOrCreateDraftForTable(BigInt(table.id));
    const orderId = draftState.order.id;

    // 3. Ensure totals are fresh
    await calculateTotals(orderId);

    // 4. Generate suggestions
    const suggestions = await upsellService.generateSuggestions(orderId);

    return c.json({
      success: true,
      data: suggestions
    }, 200);
  } catch (error: any) {
    console.error("[UpsellController] Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
}
