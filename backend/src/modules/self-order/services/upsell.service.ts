import { db } from "../../../db/index.ts";
import { eq, and, isNull, or } from "drizzle-orm";
import { promotions, products } from "../../../db/schema/index.ts";
import { getOrderById } from "../../../services/order.service.ts";
import { MenuService } from "./menu.service.ts";
import { GoogleGenAI } from "@google/genai";

export class UpsellService {
  private menuService: MenuService;
  private ai: GoogleGenAI | null;

  constructor() {
    this.menuService = new MenuService();
    // Initialize Gemini API if key is present
    const apiKey = process.env.GEMINI_API_KEY;
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async generateSuggestions(orderId: bigint) {
    // 1. Fetch current order with its items
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const subtotal = Number(order.subtotal);
    const orderItems = order.items || [];
    
    // We will build a list of raw suggestions
    const rawSuggestions: { type: "NUDGE" | "COMPLEMENT"; text: string; productId?: string; priority: number }[] = [];

    // --- A. Threshold Nudges ---
    const activePromos = await db.query.promotions.findMany({
      where: and(
        eq(promotions.status, "ACTIVE"),
        or(eq(promotions.type, "AUTO_PRODUCT_QTY"), eq(promotions.type, "AUTO_ORDER_AMOUNT"))
      )
    });

    const now = new Date();
    for (const p of activePromos) {
      // Check validity window
      if (p.startsAt && p.startsAt > now) continue;
      if (p.expiresAt && p.expiresAt < now) continue;
      if (p.maxUses !== null && p.usedCount >= p.maxUses) continue;

      if (p.type === "AUTO_ORDER_AMOUNT" && p.minOrderAmount) {
        const threshold = Number(p.minOrderAmount);
        if (subtotal < threshold) {
          const diff = threshold - subtotal;
          // Near miss! (Only suggest if they are within 40% of the threshold, else it feels spammy)
          if (subtotal > 0 && diff <= threshold * 0.4) {
            rawSuggestions.push({
              type: "NUDGE",
              text: `Add ₹${diff.toFixed(2)} more to unlock ${p.name}!`,
              priority: 10, // High priority
            });
          }
        }
      }

      if (p.type === "AUTO_PRODUCT_QTY" && p.triggerProductId && p.triggerQty) {
        // Find how many they have
        const item = orderItems.find(i => String(i.productId) === String(p.triggerProductId));
        const currentQty = item ? item.quantity : 0;
        const requiredQty = p.triggerQty;

        if (currentQty > 0 && currentQty < requiredQty) {
          const diff = requiredQty - currentQty;
          // Fetch product name for the copy
          const triggerProd = await db.query.products.findFirst({ where: eq(products.id, p.triggerProductId) });
          if (triggerProd) {
            rawSuggestions.push({
              type: "NUDGE",
              text: `Add ${diff} more ${triggerProd.name} to unlock ${p.name}!`,
              productId: triggerProd.publicId, // Allow frontend to easily add it
              priority: 9,
            });
          }
        }
      }
    }

    // --- B. Category-Gap Heuristic ---
    const allCategories = await this.menuService.getCategories();
    // Fetch active products
    const allProductsRes = await this.menuService.getProducts(undefined, undefined, 1, 500);
    const activeProducts = allProductsRes;

    // Map ordered product publicIds to their categories
    const orderedCategoryIds = new Set<string>();
    for (const item of orderItems) {
      const prodId = item.product.publicId;
      const productObj = activeProducts.find(p => p.publicId === prodId);
      if (productObj && productObj.categoryId) {
        orderedCategoryIds.add(productObj.categoryId);
      }
    }

    // Find missing categories
    const missingCategories = allCategories.filter(c => !orderedCategoryIds.has(c.publicId));
    
    // Sort missing categories by some arbitrary priority (e.g. Beverages and Desserts are great upsells)
    missingCategories.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      // Prioritize beverages
      if (nameA.includes("beverage") || nameA.includes("drink")) return -1;
      if (nameB.includes("beverage") || nameB.includes("drink")) return 1;
      // Prioritize desserts
      if (nameA.includes("dessert") || nameA.includes("sweet")) return -1;
      if (nameB.includes("dessert") || nameB.includes("sweet")) return 1;
      return 0;
    });

    if (missingCategories.length > 0) {
      const topMissingCat = missingCategories[0]!;
      // Find top product in this category
      const catProducts = activeProducts.filter(p => p.categoryId === topMissingCat.publicId);
      if (catProducts.length > 0) {
        // Just take the first one (they are sorted by sortOrder from the MenuService)
        const suggestedProd = catProducts[0]!;
        rawSuggestions.push({
          type: "COMPLEMENT",
          text: `Pair your meal with our ${suggestedProd.name}!`,
          productId: suggestedProd.publicId,
          priority: 5,
        });
      }
    }

    // Sort suggestions by priority descending
    rawSuggestions.sort((a, b) => b.priority - a.priority);

    // --- C. Optional LLM Phrasing Layer ---
    if (this.ai && process.env.USE_MOCK_UPSELL !== "true" && rawSuggestions.length > 0) {
      try {
        const systemInstruction = `You are an intelligent, friendly AI upselling assistant for Odoo Cafe.
Your goal is to take the raw, calculated suggestions provided and rewrite them into a single, punchy, conversational upsell sentence.
Do NOT hallucinate prices or products. ONLY use the exact facts provided in the raw suggestions.
If there are multiple suggestions, prioritize the "NUDGE" type over the "COMPLEMENT" type, or combine them smoothly in 1-2 sentences. Keep it very short, friendly, and enticing.`;

        const prompt = `Here are the raw computed suggestions for this cart:
${JSON.stringify(rawSuggestions, null, 2)}

Rewrite them into a brief, friendly upsell message.`;

        const response = await this.ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.3, // Low temperature for grounding
          }
        });

        const llmText = response.text || rawSuggestions[0]!.text;
        
        return {
          message: llmText,
          candidates: rawSuggestions // Send raw data so frontend can show "Add" buttons using the `productId`
        };
      } catch (e) {
        console.error("[UpsellService] LLM formatting failed, falling back to raw.", e);
        // Fall through to graceful degradation
      }
    }

    // Graceful Degradation / No-LLM mode
    const message = rawSuggestions.length > 0 
      ? rawSuggestions[0]!.text 
      : "Ready to checkout?";

    return {
      message,
      candidates: rawSuggestions
    };
  }
}

export const upsellService = new UpsellService();
