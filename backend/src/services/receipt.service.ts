import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { orders, orderItems, payments, receipts } from "../db/schema/index.ts";
import { selfOrderingSettings } from "../db/schema/12_self_ordering.ts";
import { calculateTotals } from "./order.service.ts";

// ─── Generate structured JSON receipt ──────────────────────────────────────────

export async function generateReceipt(orderId: bigint) {
  // 1. Verify order is paid
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: true,
      table: { with: { floor: true } },
      customer: true,
    },
  });

  if (!order) return { error: "NOT_FOUND" as const };
  if (order.status !== "PAID") return { error: "ORDER_NOT_PAID" as const };

  // 2. Refresh totals to ensure accuracy
  await calculateTotals(orderId);

  // 3. Fetch payment records
  const paymentRecords = await db.query.payments.findMany({
    where: eq(payments.orderId, orderId),
    with: { method: true },
  });

  // 4. Fetch business settings
  const settingsRes = await db.select().from(selfOrderingSettings).limit(1);
  const brandName = settingsRes[0]?.brandName || "Odoo Cafe";

  // Hardcode placeholder values per requirement
  const business = {
    name: brandName,
    address: "123 Cafe Street, Tech City, 12345",
    taxId: "TAX-987654321",
  };

  // 5. Construct the payload
  const payload = {
    order: {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() || new Date().toISOString(),
      type: order.type,
      tableLabel: order.table ? `${order.table.tableNumber} / ${(order.table as any).floor?.name || ""}` : null,
      customerName: order.customer?.name || "Guest",
    },
    items: order.items.map((item) => ({
      name: item.productName,
      qty: item.quantity,
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      lineTotal: Number(item.lineTotal),
    })),
    totals: {
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      taxTotal: Number(order.taxAmount),
      grandTotal: Number(order.grandTotal),
    },
    payments: paymentRecords.map((p) => ({
      method: p.method?.name || "Unknown",
      amount: Number(p.amount),
      change: Number(p.changeAmount),
      transactionRef: p.transactionRef,
    })),
    business,
  };

  // 6. Check if receipt row exists, or create it
  let receiptRow = await db.query.receipts.findFirst({
    where: eq(receipts.orderId, orderId),
  });

  if (!receiptRow) {
    const shortOrderRef = order.orderNumber.substring(0, 8);
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}-${shortOrderRef}`;
    [receiptRow] = await db.insert(receipts).values({
      orderId,
      receiptNumber,
      receiptData: JSON.stringify(payload),
    }).returning();
  }

  return { 
    success: true, 
    receiptNumber: receiptRow!.receiptNumber, 
    payload 
  };
}

// ─── Mock send receipt email ──────────────────────────────────────────────────

export async function sendReceiptEmail(orderId: bigint, email: string) {
  // 1. Generate the receipt JSON
  const result = await generateReceipt(orderId);
  if ("error" in result) return result;

  // 2. Log out the "email" (mocking email sending per requirement)
  console.log(`\n📧 [EMAIL MOCK] Sending receipt ${result.receiptNumber} to ${email}...`);
  console.log(`   Order Total: $${result.payload.totals.grandTotal.toFixed(2)}`);
  console.log(`   Items: ${result.payload.items.length}\n`);

  // 3. Update the receipts table
  await db.update(receipts)
    .set({
      isEmailSent: true,
      emailSentAt: new Date(),
      emailAddress: email,
      updatedAt: new Date(),
    })
    .where(eq(receipts.orderId, orderId));

  // Also increment emailCount if column existed, but schema shows no email_count column.
  // The schema only has is_email_sent, email_sent_at, and email_address.

  return { success: true, message: "Receipt emailed successfully" };
}
