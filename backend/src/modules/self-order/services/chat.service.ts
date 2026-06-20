import { GoogleGenAI } from "@google/genai";
import { db } from "../../../db/index.ts";
import { promotions } from "../../../db/schema/index.ts";
import { MenuService } from "./menu.service.ts";
import { eq } from "drizzle-orm";

export class ChatService {
  private menuService: MenuService;
  private ai: GoogleGenAI | null = null;

  constructor() {
    this.menuService = new MenuService();
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async buildContextBlock(): Promise<string> {
    // 1. Fetch available products (MenuService already handles is_available = true)
    const activeProducts = await this.menuService.getProducts(undefined, undefined, 1, 500);

    let menuText = "[MENU]\n";
    for (const p of activeProducts) {
      // Basic formatting for token efficiency
      menuText += `- Name: ${p.name} | Price: ${p.price}`;
      if (p.description) menuText += ` | Desc: ${p.description}`;
      menuText += "\n";
    }

    // 2. Fetch active promotions
    const activePromos = await db.query.promotions.findMany({
      where: eq(promotions.status, "ACTIVE"),
    });

    let promoText = "\n[PROMOTIONS]\n";
    if (activePromos.length === 0) {
      promoText += "No active promotions at the moment.\n";
    } else {
      for (const promo of activePromos) {
        promoText += `- ${promo.name} (${promo.type}): Discount ${promo.discountValue}\n`;
      }
    }

    return menuText + promoText;
  }

  async handleChat(messages: { role: string; text: string }[], newMsg: string): Promise<string> {
    // Graceful degradation / Stub mode
    if (process.env.USE_MOCK_CHAT === "true" || !this.ai) {
      return "I'm currently in stub mode! I see you said: " + newMsg;
    }

    try {
      const contextBlock = await this.buildContextBlock();
      const systemInstruction = `You are a helpful, friendly virtual waiter for Odoo Cafe.
Your goal is to answer customer questions about our menu, pricing, and promotions.
ONLY recommend items from the menu below. If an item is not below, we do not have it. Do not hallucinate items.
If a customer asks about dietary restrictions (e.g., vegan, allergies), politely decline to answer, as we do not have dietary tags configured yet.
Prices are in INR (₹).

${contextBlock}`;

      // Convert history
      const formattedHistory = messages.map(m => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.text }],
      }));

      // Append the new message to history
      formattedHistory.push({
        role: "user",
        parts: [{ text: newMsg }]
      });

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: formattedHistory,
        config: {
          systemInstruction,
          temperature: 0.2, // Low temp for grounded factual answers
        }
      });

      return response.text || "I'm not sure how to respond to that.";
    } catch (error) {
      console.error("[ChatService] Gemini API Error:", error);
      // Graceful fallback response
      return "I'm having trouble connecting right now. Please browse the menu directly to place your order!";
    }
  }
}
