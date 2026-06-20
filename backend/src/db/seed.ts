/**
 * Development seed — wipes and repopulates demo data for API testing.
 *
 * Run:  bun run db:seed   (from backend/)
 * Requires Postgres (docker compose up -d).
 */
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
import { db } from "./index.ts";
import {
  staffAccounts,
  productCategories,
  products,
  floors,
  floorTables,
  customers,
  promotions,
  posSessions,
  orders,
  orderItems,
  paymentMethods,
  payments,
  receipts,
  kitchenTickets,
  kitchenTicketItems,
  selfOrderingSettings,
} from "./schema/index.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../.env") });
config({ path: resolve(__dirname, "../.env"), override: true });

if (!process.env["DATABASE_URL"]) {
  const host = process.env["POSTGRES_HOST"] ?? "localhost";
  const port = process.env["POSTGRES_PORT"] ?? "5433";
  const user = process.env["POSTGRES_USER"] ?? "cafe_user";
  const pass = process.env["POSTGRES_PASSWORD"] ?? "cafe_pass";
  const dbName = process.env["POSTGRES_DB"] ?? "cafe_pos";
  process.env["DATABASE_URL"] = `postgresql://${user}:${pass}@${host}:${port}/${dbName}`;
}

const DEMO_PASSWORD = "password123";
const BCRYPT_ROUNDS = Number(process.env["BCRYPT_ROUNDS"] ?? 12);

// Fixed public IDs — stable across re-seeds for curl / Swagger tests
const IDS = {
  staff: {
    admin: "a0000001-0001-4001-8001-000000000001",
    cashier: "a0000001-0001-4001-8001-000000000002",
    manager: "a0000001-0001-4001-8001-000000000003",
    archived: "a0000001-0001-4001-8001-000000000004",
  },
  categories: {
    beverages: "b0000001-0001-4001-8001-000000000001",
    mains: "b0000001-0001-4001-8001-000000000002",
    snacks: "b0000001-0001-4001-8001-000000000003",
  },
  products: {
    mangoLassi: "c0000001-0001-4001-8001-000000000001",
    masalaChai: "c0000001-0001-4001-8001-000000000002",
    paneerTikka: "c0000001-0001-4001-8001-000000000003",
    samosa: "c0000001-0001-4001-8001-000000000004",
    deletedSnack: "c0000001-0001-4001-8001-000000000005",
  },
  floors: {
    ground: "d0000001-0001-4001-8001-000000000001",
    outdoor: "d0000001-0001-4001-8001-000000000002",
  },
  tables: {
    t01: "e0000001-0001-4001-8001-000000000001",
    t02: "e0000001-0001-4001-8001-000000000002",
    t03: "e0000001-0001-4001-8001-000000000003",
    outdoor: "e0000001-0001-4001-8001-000000000004",
  },
  customers: {
    ravi: "f0000001-0001-4001-8001-000000000001",
    priya: "f0000001-0001-4001-8001-000000000002",
    deleted: "f0000001-0001-4001-8001-000000000003",
  },
  sessions: {
    open: "10000001-0001-4001-8001-000000000001",
    closed: "10000001-0001-4001-8001-000000000002",
  },
  orders: {
    draftTakeaway: "20000001-0001-4001-8001-000000000001",
    draftDineIn: "20000001-0001-4001-8001-000000000002",
    kitchen: "20000001-0001-4001-8001-000000000003",
    paidToday: "20000001-0001-4001-8001-000000000004",
    paidHistory: "20000001-0001-4001-8001-000000000005",
    cancelled: "20000001-0001-4001-8001-000000000006",
  },
  promotions: {
    save20: "30000001-0001-4001-8001-000000000001",
    flat50: "30000001-0001-4001-8001-000000000002",
    bigOrder: "30000001-0001-4001-8001-000000000003",
    chaiQty: "30000001-0001-4001-8001-000000000004",
  },
  paymentMethods: {
    cash: "40000001-0001-4001-8001-000000000001",
    card: "40000001-0001-4001-8001-000000000002",
    upi: "40000001-0001-4001-8001-000000000003",
  },
  kds: {
    ticket: "50000001-0001-4001-8001-000000000001",
    ticketItem: "50000001-0001-4001-8001-000000000002",
  },
};

async function truncateAll() {
  await db.execute(sql`
    TRUNCATE TABLE
      audit_logs,
      customer_display_sessions,
      kitchen_ticket_items,
      kitchen_tickets,
      receipts,
      payments,
      order_items,
      orders,
      pos_sessions,
      promotions,
      customers,
      floor_tables,
      floors,
      products,
      product_categories,
      payment_methods,
      self_ordering_settings,
      staff_accounts
    RESTART IDENTITY CASCADE
  `);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function lineTotals(price: number, qty: number, taxRate: number) {
  const sub = price * qty;
  const tax = (sub * taxRate) / 100;
  return {
    taxAmount: tax.toFixed(2),
    lineTotal: (sub + tax).toFixed(2),
  };
}

async function seed() {
  console.log("🗑️  Clearing existing data…");
  await truncateAll();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const now = new Date();
  const yesterday = daysAgo(1);
  const lastWeek = daysAgo(5);

  console.log("👤 Staff…");
  const staffRows = await db
    .insert(staffAccounts)
    .values([
      {
        publicId: IDS.staff.admin,
        name: "Demo Admin",
        email: "admin@demo.cafe",
        phone: "+919800000001",
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        publicId: IDS.staff.cashier,
        name: "Demo Cashier",
        email: "cashier@demo.cafe",
        phone: "+919800000002",
        passwordHash,
        role: "CASHIER",
        status: "ACTIVE",
        pin: "123456",
      },
      {
        publicId: IDS.staff.manager,
        name: "Demo Kitchen Staff",
        email: "kitchen@demo.cafe",
        phone: "+919800000003",
        passwordHash,
        role: "KITCHEN",
        status: "ACTIVE",
      },
      {
        publicId: IDS.staff.archived,
        name: "Archived Staff",
        email: "archived@demo.cafe",
        passwordHash,
        role: "CASHIER",
        status: "ARCHIVED",
        archivedAt: lastWeek,
      },
    ])
    .returning({ id: staffAccounts.id, publicId: staffAccounts.publicId, email: staffAccounts.email });

  const adminId = staffRows[0]!.id;
  const cashierId = staffRows[1]!.id;

  console.log("📂 Categories & products…");
  const catRows = await db
    .insert(productCategories)
    .values([
      { publicId: IDS.categories.beverages, name: "Beverages", color: "#3b82f6", sortOrder: 1 },
      { publicId: IDS.categories.mains, name: "Main Course", color: "#ef4444", sortOrder: 2 },
      { publicId: IDS.categories.snacks, name: "Snacks", color: "#f59e0b", sortOrder: 3 },
    ])
    .returning({ id: productCategories.id, publicId: productCategories.publicId, name: productCategories.name });

  const beveragesId = catRows[0]!.id;
  const mainsId = catRows[1]!.id;
  const snacksId = catRows[2]!.id;

  const prodRows = await db
    .insert(products)
    .values([
      {
        publicId: IDS.products.mangoLassi,
        categoryId: beveragesId,
        name: "Mango Lassi",
        description: "Sweet mango yogurt drink",
        price: "80.00",
        uom: "GLASS",
        taxType: "INCLUSIVE",
        taxRate: "5.00",
        isFeatured: true,
        sortOrder: 1,
      },
      {
        publicId: IDS.products.masalaChai,
        categoryId: beveragesId,
        name: "Masala Chai",
        description: "Spiced Indian tea",
        price: "30.00",
        uom: "CUP",
        taxRate: "0.00",
        sortOrder: 2,
      },
      {
        publicId: IDS.products.paneerTikka,
        categoryId: mainsId,
        name: "Paneer Tikka",
        description: "Grilled cottage cheese",
        price: "180.00",
        uom: "PLATE",
        taxRate: "5.00",
        sendToKitchen: true,
        sortOrder: 1,
      },
      {
        publicId: IDS.products.samosa,
        categoryId: snacksId,
        name: "Samosa",
        description: "Crispy potato snack",
        price: "20.00",
        uom: "PIECE",
        taxRate: "5.00",
        sortOrder: 1,
      },
      {
        publicId: IDS.products.deletedSnack,
        categoryId: snacksId,
        name: "Old Pakora",
        price: "25.00",
        taxRate: "5.00",
        isAvailable: false,
        deletedAt: lastWeek,
      },
    ])
    .returning({ id: products.id, publicId: products.publicId, name: products.name });

  const mangoId = prodRows[0]!.id;
  const chaiId = prodRows[1]!.id;
  const tikkaId = prodRows[2]!.id;
  const samosaId = prodRows[3]!.id;

  console.log("🪑 Floors & tables…");
  const floorRows = await db
    .insert(floors)
    .values([
      { publicId: IDS.floors.ground, name: "Ground Floor", sortOrder: 1 },
      { publicId: IDS.floors.outdoor, name: "Outdoor", sortOrder: 2 },
    ])
    .returning({ id: floors.id, publicId: floors.publicId });

  const groundFloorId = floorRows[0]!.id;
  const outdoorFloorId = floorRows[1]!.id;

  await db.insert(floorTables).values([
    {
      publicId: IDS.tables.t01,
      floorId: groundFloorId,
      tableNumber: "T-01",
      seats: 4,
      state: "ACTIVE",
      posX: 10,
      posY: 10,
    },
    {
      publicId: IDS.tables.t02,
      floorId: groundFloorId,
      tableNumber: "T-02",
      seats: 4,
      state: "ACTIVE",
      posX: 120,
      posY: 10,
    },
    {
      publicId: IDS.tables.t03,
      floorId: groundFloorId,
      tableNumber: "T-03",
      seats: 6,
      state: "AVAILABLE",
      posX: 230,
      posY: 10,
    },
    {
      publicId: IDS.tables.outdoor,
      floorId: outdoorFloorId,
      tableNumber: "O-01",
      seats: 2,
      state: "AVAILABLE",
      isActive: false,
    },
  ]);

  const tableRows = await db.query.floorTables.findMany({
    columns: { id: true, publicId: true, tableNumber: true },
  });
  const t01 = tableRows.find((t) => t.publicId === IDS.tables.t01)!;
  const t02 = tableRows.find((t) => t.publicId === IDS.tables.t02)!;

  console.log("🧑 Customers…");
  await db.insert(customers).values([
    {
      publicId: IDS.customers.ravi,
      name: "Ravi Kumar",
      email: "ravi@demo.cafe",
      phone: "+919876543210",
    },
    {
      publicId: IDS.customers.priya,
      name: "Priya Sharma",
      email: "priya@demo.cafe",
      phone: "+919876543211",
    },
    {
      publicId: IDS.customers.deleted,
      name: "Deleted Guest",
      email: "deleted@demo.cafe",
      deletedAt: lastWeek,
    },
  ]);

  const ravi = await db.query.customers.findFirst({
    where: (c, { eq }) => eq(c.publicId, IDS.customers.ravi),
    columns: { id: true },
  });

  console.log("🎟️  Promotions…");
  const promoStarts = daysAgo(30);
  const promoExpires = new Date(now);
  promoExpires.setMonth(promoExpires.getMonth() + 3);

  await db.insert(promotions).values([
    {
      publicId: IDS.promotions.save20,
      name: "Save 20%",
      type: "COUPON_PERCENTAGE",
      status: "ACTIVE",
      couponCode: "SAVE20",
      discountValue: "20.00",
      maxUses: 100,
      usedCount: 2,
      startsAt: promoStarts,
      expiresAt: promoExpires,
    },
    {
      publicId: IDS.promotions.flat50,
      name: "Flat ₹50 Off",
      type: "COUPON_FIXED",
      status: "ACTIVE",
      couponCode: "FLAT50",
      discountValue: "50.00",
      minOrderAmount: "200.00",
      maxUses: 50,
      usedCount: 0,
      startsAt: promoStarts,
      expiresAt: promoExpires,
    },
    {
      publicId: IDS.promotions.bigOrder,
      name: "Big Order Bonus",
      type: "AUTO_ORDER_AMOUNT",
      status: "ACTIVE",
      discountValue: "75.00",
      minOrderAmount: "500.00",
      maxUses: null,
      usedCount: 0,
    },
    {
      publicId: IDS.promotions.chaiQty,
      name: "Chai Combo",
      type: "AUTO_PRODUCT_QTY",
      status: "ACTIVE",
      discountValue: "15.00",
      triggerProductId: chaiId,
      triggerQty: 2,
      maxUses: null,
      usedCount: 0,
    },
  ]);

  console.log("💳 Payment methods…");
  const methodRows = await db
    .insert(paymentMethods)
    .values([
      { publicId: IDS.paymentMethods.cash, name: "Cash", type: "CASH", sortOrder: 1 },
      { publicId: IDS.paymentMethods.card, name: "Card", type: "CARD", sortOrder: 2 },
      {
        publicId: IDS.paymentMethods.upi,
        name: "UPI",
        type: "UPI_QR",
        upiId: "demo@cafeupi",
        sortOrder: 3,
      },
    ])
    .returning({ id: paymentMethods.id, publicId: paymentMethods.publicId, name: paymentMethods.name });

  const cashMethodId = methodRows[0]!.id;

  console.log("🕐 POS sessions…");
  const sessionRows = await db
    .insert(posSessions)
    .values([
      {
        publicId: IDS.sessions.closed,
        openedById: adminId,
        closedById: adminId,
        status: "CLOSED",
        openingCash: "1000.00",
        closingCash: "2500.00",
        actualCash: "1680.00",
        closingSaleAmount: "1680.00",
        openedAt: lastWeek,
        closedAt: yesterday,
      },
      {
        publicId: IDS.sessions.open,
        openedById: cashierId,
        status: "OPEN",
        openingCash: "1500.00",
        openedAt: now,
      },
    ])
    .returning({ id: posSessions.id, publicId: posSessions.publicId, status: posSessions.status });

  const closedSessionId = sessionRows[0]!.id;
  const openSessionId = sessionRows[1]!.id;

  console.log("🛒 Orders…");
  const mangoLine = lineTotals(80, 2, 5);
  const chaiLine = lineTotals(30, 2, 0);
  const tikkaLine = lineTotals(180, 1, 5);

  const orderRows = await db
    .insert(orders)
    .values([
      {
        publicId: IDS.orders.draftTakeaway,
        orderNumber: "ORD-SEED-0001",
        sessionId: openSessionId,
        staffId: cashierId,
        source: "POS",
        type: "TAKEAWAY",
        status: "DRAFT",
        subtotal: "0.00",
        taxAmount: "0.00",
        discountAmount: "0.00",
        grandTotal: "0.00",
        guestName: "Walk-in Guest",
      },
      {
        publicId: IDS.orders.draftDineIn,
        orderNumber: "ORD-SEED-0002",
        sessionId: openSessionId,
        tableId: t02.id,
        staffId: cashierId,
        customerId: ravi?.id,
        source: "POS",
        type: "DINE_IN",
        status: "DRAFT",
        subtotal: "60.00",
        taxAmount: "0.00",
        discountAmount: "0.00",
        grandTotal: "60.00",
      },
      {
        publicId: IDS.orders.kitchen,
        orderNumber: "ORD-SEED-0003",
        sessionId: openSessionId,
        tableId: t01.id,
        staffId: cashierId,
        source: "POS",
        type: "DINE_IN",
        status: "SENT_TO_KITCHEN",
        subtotal: "180.00",
        taxAmount: "9.00",
        discountAmount: "0.00",
        grandTotal: "189.00",
      },
      {
        publicId: IDS.orders.paidToday,
        orderNumber: "ORD-SEED-0004",
        sessionId: openSessionId,
        staffId: cashierId,
        customerId: ravi?.id,
        source: "POS",
        type: "TAKEAWAY",
        status: "PAID",
        subtotal: "160.00",
        taxAmount: "8.00",
        discountAmount: "0.00",
        grandTotal: "168.00",
        paidAt: now,
      },
      {
        publicId: IDS.orders.paidHistory,
        orderNumber: "ORD-SEED-0005",
        sessionId: closedSessionId,
        staffId: adminId,
        source: "POS",
        type: "DINE_IN",
        status: "PAID",
        subtotal: "160.00",
        taxAmount: "8.00",
        discountAmount: "0.00",
        grandTotal: "168.00",
        paidAt: lastWeek,
      },
      {
        publicId: IDS.orders.cancelled,
        orderNumber: "ORD-SEED-0006",
        sessionId: openSessionId,
        staffId: cashierId,
        source: "POS",
        type: "TAKEAWAY",
        status: "CANCELLED",
        cancelReason: "Customer changed mind",
      },
    ])
    .returning({ id: orders.id, publicId: orders.publicId, orderNumber: orders.orderNumber, status: orders.status });

  const draftDineInId = orderRows[1]!.id;
  const kitchenOrderId = orderRows[2]!.id;
  const paidTodayId = orderRows[3]!.id;
  const paidHistoryId = orderRows[4]!.id;

  const itemRows = await db
    .insert(orderItems)
    .values([
      {
        orderId: draftDineInId,
        productId: chaiId,
        productName: "Masala Chai",
        quantity: 2,
        unitPrice: "30.00",
        taxRate: "0.00",
        taxAmount: chaiLine.taxAmount,
        lineTotal: chaiLine.lineTotal,
        kitchenState: "TO_COOK",
      },
      {
        orderId: kitchenOrderId,
        productId: tikkaId,
        productName: "Paneer Tikka",
        quantity: 1,
        unitPrice: "180.00",
        taxRate: "5.00",
        taxAmount: tikkaLine.taxAmount,
        lineTotal: tikkaLine.lineTotal,
        kitchenState: "PREPARING",
        notes: "Extra spicy",
      },
      {
        orderId: paidTodayId,
        productId: mangoId,
        productName: "Mango Lassi",
        quantity: 2,
        unitPrice: "80.00",
        taxRate: "5.00",
        taxAmount: mangoLine.taxAmount,
        lineTotal: mangoLine.lineTotal,
        kitchenState: "COMPLETED",
      },
      {
        orderId: paidHistoryId,
        productId: mangoId,
        productName: "Mango Lassi",
        quantity: 2,
        unitPrice: "80.00",
        taxRate: "5.00",
        taxAmount: mangoLine.taxAmount,
        lineTotal: mangoLine.lineTotal,
        kitchenState: "COMPLETED",
      },
    ])
    .returning({ id: orderItems.id, publicId: orderItems.publicId, orderId: orderItems.orderId });

  const kitchenItem = itemRows.find((i) => i.orderId === kitchenOrderId)!;
  const paidTodayItem = itemRows.find((i) => i.orderId === paidTodayId)!;

  console.log("🍳 KDS tickets…");
  const [ticket] = await db
    .insert(kitchenTickets)
    .values({
      publicId: IDS.kds.ticket,
      orderId: kitchenOrderId,
      tableId: t01.id,
      ticketNumber: 1,
      status: "IN_PROGRESS",
      tableLabel: "T-01 / Ground Floor",
      orderType: "DINE_IN",
      startedAt: now,
    })
    .returning({ id: kitchenTickets.id });

  await db.insert(kitchenTicketItems).values({
    publicId: IDS.kds.ticketItem,
    ticketId: ticket!.id,
    orderItemId: kitchenItem.id,
    productName: "Paneer Tikka",
    quantity: 1,
    notes: "Extra spicy",
    state: "PREPARING",
    startedAt: now,
  });

  console.log("💰 Payments & receipts…");
  await db.insert(payments).values([
    {
      orderId: paidTodayId,
      methodId: cashMethodId,
      amount: "168.00",
      status: "COMPLETED",
      paidAt: now,
    },
    {
      orderId: paidHistoryId,
      methodId: cashMethodId,
      amount: "168.00",
      status: "COMPLETED",
      paidAt: lastWeek,
    },
  ]);

  await db.insert(receipts).values([
    {
      orderId: paidTodayId,
      receiptNumber: "RCP-SEED-0001",
      isPrinted: true,
      printedAt: now,
    },
    {
      orderId: paidHistoryId,
      receiptNumber: "RCP-SEED-0002",
    },
  ]);

  console.log("📱 Self-ordering settings…");
  await db.insert(selfOrderingSettings).values({
    isEnabled: true,
    onlineOrderingEnabled: false,
    qrMenuEnabled: true,
    brandName: "Demo Café",
    welcomeMessage: "Scan to order at your table",
    accentColor: "#6366f1",
  });

  const manifest = {
    login: { email: "cashier@demo.cafe", password: DEMO_PASSWORD },
    staff: IDS.staff,
    categories: IDS.categories,
    products: IDS.products,
    floors: IDS.floors,
    tables: IDS.tables,
    customers: IDS.customers,
    promotions: { ...IDS.promotions, couponCodes: { SAVE20: "SAVE20", FLAT50: "FLAT50" } },
    paymentMethods: IDS.paymentMethods,
    sessions: IDS.sessions,
    orders: IDS.orders,
    kds: IDS.kds,
    samples: {
      draftOrderForItems: IDS.orders.draftTakeaway,
      draftOrderWithCustomer: IDS.orders.draftDineIn,
      kitchenOrder: IDS.orders.kitchen,
      paidOrder: IDS.orders.paidToday,
      productToAdd: IDS.products.samosa,
      customerToAttach: IDS.customers.priya,
      couponValidate: { code: "SAVE20", orderId: IDS.orders.draftTakeaway },
      eligibleCoupons: IDS.orders.draftDineIn,
    },
  };

  console.log("\n✅ Seed complete!\n");
  console.log("── Login (cashier) ─────────────────────────────");
  console.log(`  email:    cashier@demo.cafe`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log("\n── Stable public IDs (copy into API tests) ─────");
  console.log(JSON.stringify(manifest, null, 2));
  console.log("\n── Quick curl examples ─────────────────────────");
  console.log(`  GET  /api/categories`);
  console.log(`  GET  /api/products/${IDS.products.mangoLassi}`);
  console.log(`  POST /api/orders/${IDS.orders.draftTakeaway}/items  { productId, quantity }`);
  console.log(`  GET  /api/kds/tickets`);
  console.log(`  POST /api/coupons/validate  { code: "SAVE20", orderId: "${IDS.orders.draftTakeaway}" }`);
  console.log(`  GET  /api/reports/kpis?period=today`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
