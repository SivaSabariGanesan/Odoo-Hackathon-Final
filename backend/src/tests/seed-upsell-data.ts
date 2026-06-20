import "dotenv/config";
import { db } from "../db/index.ts";
import { productCategories, products, promotions } from "../db/schema/index.ts";
import { eq } from "drizzle-orm";

async function runSeed() {
  console.log("🌱 Seeding Upsell & Chatbot Data...");

  // 1. Categories
  const [beverageCat] = await db.insert(productCategories).values({
    name: "Beverages",
    color: "#3b82f6",
    sortOrder: 1,
  }).returning();

  const [dessertCat] = await db.insert(productCategories).values({
    name: "Desserts",
    color: "#ec4899",
    sortOrder: 2,
  }).returning();

  const [mainsCat] = await db.insert(productCategories).values({
    name: "Main Course",
    color: "#f59e0b",
    sortOrder: 0,
  }).onConflictDoNothing({ target: productCategories.name }).returning();

  const mainCategoryId = mainsCat ? mainsCat.id : (await db.select().from(productCategories).where(eq(productCategories.name, "Main Course")).limit(1))[0]?.id;

  // 2. Products
  console.log("📦 Inserting Products...");
  await db.insert(products).values([
    {
      categoryId: beverageCat.id,
      name: "Masala Chai",
      description: "Authentic spiced Indian tea.",
      price: "50.00",
      isAvailable: true,
      sortOrder: 1,
    },
    {
      categoryId: beverageCat.id,
      name: "Mango Lassi",
      description: "Refreshing yogurt-based mango drink.",
      price: "120.00",
      isAvailable: true,
      sortOrder: 2,
    },
    {
      categoryId: dessertCat.id,
      name: "Gulab Jamun",
      description: "Soft, melt-in-your-mouth milk dumplings in rose syrup.",
      price: "90.00",
      isAvailable: true,
      sortOrder: 1,
    },
    {
      categoryId: dessertCat.id,
      name: "Rasmalai",
      description: "Rich cheesecake without a crust in sweet thickened milk.",
      price: "140.00",
      isAvailable: true,
      sortOrder: 2,
    },
    {
      categoryId: mainCategoryId || beverageCat.id, // Fallback if mains somehow missing
      name: "Paneer Butter Masala",
      description: "Rich and creamy cottage cheese curry.",
      price: "250.00",
      isAvailable: true,
      sortOrder: 1,
    }
  ]);

  // 3. Promotions (For Threshold Nudges)
  console.log("🎟️ Inserting Promotions...");
  await db.insert(promotions).values([
    {
      name: "Spend 500 Get 50 Off",
      type: "AUTO_ORDER_AMOUNT",
      status: "ACTIVE",
      discountType: "FIXED",
      discountValue: "50.00",
      minOrderAmount: "500.00",
    },
    {
      name: "Free Chai with 3 Items",
      type: "AUTO_PRODUCT_QTY",
      status: "ACTIVE",
      discountType: "FIXED",
      discountValue: "50.00", // Discounting the price of the chai
      triggerProductId: (await db.query.products.findFirst({ where: eq(products.name, "Masala Chai") }))?.id || 1n,
      triggerQty: 3,
    }
  ]);

  console.log("✅ Seeding Complete! You can now test Smart Upseller and Chatbot.");
  process.exit(0);
}

runSeed().catch(console.error);
