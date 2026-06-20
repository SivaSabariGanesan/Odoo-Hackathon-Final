import { db } from "../../../db/index.ts";
import { productCategories, products } from "../../../db/schema/02_products.ts";
import { eq, and, ilike, isNull, asc } from "drizzle-orm";

export class MenuService {
  async getCategories() {
    return db
      .select({
        publicId: productCategories.publicId,
        name: productCategories.name,
        color: productCategories.color,
        sortOrder: productCategories.sortOrder,
      })
      .from(productCategories)
      .where(eq(productCategories.isActive, true))
      .orderBy(asc(productCategories.sortOrder));
  }

  async getProducts(categoryId?: string, search?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    let conditions = and(
      eq(products.isAvailable, true),
      isNull(products.deletedAt)
    );

    if (categoryId) {
      // Find the internal category id
      const [cat] = await db.select().from(productCategories).where(eq(productCategories.publicId, categoryId)).limit(1);
      if (cat) {
        conditions = and(conditions, eq(products.categoryId, cat.id));
      } else {
        // Return empty if category not found
        return [];
      }
    }

    if (search) {
      conditions = and(conditions, ilike(products.name, `%${search}%`));
    }

    return db
      .select({
        publicId: products.publicId,
        name: products.name,
        description: products.description,
        imageUrl: products.imageUrl,
        price: products.price,
        taxType: products.taxType,
        taxRate: products.taxRate,
        uom: products.uom,
        categoryId: productCategories.publicId,
        isFeatured: products.isFeatured,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(conditions)
      .orderBy(asc(products.sortOrder))
      .limit(limit)
      .offset(offset);
  }

  async getProduct(publicId: string) {
    const [product] = await db
      .select({
        publicId: products.publicId,
        name: products.name,
        description: products.description,
        imageUrl: products.imageUrl,
        price: products.price,
        taxType: products.taxType,
        taxRate: products.taxRate,
        uom: products.uom,
        categoryId: productCategories.publicId,
        isFeatured: products.isFeatured,
        isAvailable: products.isAvailable,
        deletedAt: products.deletedAt,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(eq(products.publicId, publicId))
      .limit(1);

    return product || null;
  }
}

export const menuService = new MenuService();
