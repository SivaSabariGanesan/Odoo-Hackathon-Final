import { db } from "../../../db/index.ts";
import { selfOrderingSettings } from "../../../db/schema/12_self_ordering.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { configUpdateSchema } from "../validators/config.schema.ts";

export class ConfigService {
  /**
   * Get the singleton self-ordering configuration.
   * If no config exists, it will return a default configuration object
   * (but will not insert it until explicitly saved).
   */
  async getConfig() {
    const records = await db.select().from(selfOrderingSettings).limit(1);
    
    if (records.length === 0) {
      // Return a default object matching the schema defaults
      return {
        isEnabled: false,
        onlineOrderingEnabled: false,
        qrMenuEnabled: true,
        brandName: null,
        logoUrl: null,
        bgColor: "#ffffff",
        bgImageUrl: null,
        accentColor: "#6366f1",
        welcomeMessage: null,
      };
    }
    
    const config = records[0]!;
    return { ...config, id: config.id?.toString() };
  }

  /**
   * Update or create the singleton configuration.
   */
  async updateConfig(data: z.infer<typeof configUpdateSchema>) {
    const records = await db.select().from(selfOrderingSettings).limit(1);
    
    if (records.length === 0) {
      // Create new config
      const [newConfig] = await db.insert(selfOrderingSettings)
        .values(data)
        .returning();
      return { ...newConfig!, id: newConfig!.id?.toString() };
    }
    
    // Update existing config
    const [updatedConfig] = await db.update(selfOrderingSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(selfOrderingSettings.id, records[0]!.id))
      .returning();
      
    return { ...updatedConfig!, id: updatedConfig!.id?.toString() };
  }
}

export const configService = new ConfigService();
