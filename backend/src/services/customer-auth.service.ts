import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db/index.ts";
import { customers, orders, orderItems, receipts } from "../db/schema/index.ts";
import { hashPassword, verifyPassword } from "../utils/password.ts";
import { generateReceiptNumber } from "../utils/orderNumber.ts";
import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth.ts";
import { sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerRegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface CustomerLoginInput {
  email: string;
  password: string;
}

// ─── JWT helpers (customer-scoped token) ─────────────────────────────────────

function signCustomerToken(customerId: string, email: string): string {
  return jwt.sign(
    { sub: customerId, email, role: "CUSTOMER" },
    authConfig.jwt.secret,
    { expiresIn: authConfig.jwt.accessTokenExpiry } as jwt.SignOptions,
  );
}

export function verifyCustomerToken(token: string): { sub: string; email: string; role: string } | null {
  try {
    const payload = jwt.verify(token, authConfig.jwt.secret) as any;
    if (payload.role !== "CUSTOMER") return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function customerRegister(input: CustomerRegisterInput) {
  // Check duplicate email — only among customers who have a password (registered)
  const existing = await db.query.customers.findFirst({
    where: (c, { eq, and, isNull: isNullFn }) =>
      and(eq(c.email, input.email), isNullFn(c.deletedAt)),
  });

  if (existing && (existing as any).password_hash) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }

  const passwordHash = await hashPassword(input.password);

  if (existing) {
    // Customer record already exists (added by cashier) — just add password
    await db.execute(
      sql`UPDATE customers SET password_hash = ${passwordHash}, name = ${input.name}, phone = ${input.phone ?? existing.phone}, updated_at = now() WHERE id = ${existing.id}`,
    );
    const updated = await db.query.customers.findFirst({
      where: eq(customers.id, existing.id),
    });
    return { customer: toPublicCustomer(updated!), accessToken: signCustomerToken(updated!.publicId, input.email) };
  }

  // Fresh registration
  const [customer] = await db.insert(customers).values({
    name:  input.name,
    email: input.email,
    phone: input.phone,
  }).returning();

  if (!customer) throw new Error("Failed to create customer account");

  await db.execute(
    sql`UPDATE customers SET password_hash = ${passwordHash} WHERE id = ${customer.id}`,
  );

  return {
    customer:    toPublicCustomer(customer),
    accessToken: signCustomerToken(customer.publicId, input.email),
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function customerLogin(input: CustomerLoginInput) {
  const row = await db.execute(
    sql`SELECT id, public_id, name, email, phone, password_hash, deleted_at
        FROM customers
        WHERE email = ${input.email}
        LIMIT 1`,
  );

  const customer = row.rows[0] as any;
  if (!customer || customer.deleted_at) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }
  if (!customer.password_hash) {
    throw Object.assign(new Error("No password set. Please register first."), { status: 401 });
  }

  const valid = await verifyPassword(input.password, customer.password_hash);
  if (!valid) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  return {
    customer:    { id: customer.public_id, name: customer.name, email: customer.email, phone: customer.phone },
    accessToken: signCustomerToken(customer.public_id, customer.email),
  };
}

// ─── Me (profile + order history) ────────────────────────────────────────────

export async function getCustomerProfile(customerPublicId: string) {
  const customer = await db.query.customers.findFirst({
    where: (c, { eq, and, isNull: isNullFn }) =>
      and(eq(c.publicId, customerPublicId), isNullFn(c.deletedAt)),
  });
  if (!customer) throw Object.assign(new Error("Customer not found"), { status: 404 });

  // Last 5 paid orders
  const recentOrders = await db.query.orders.findMany({
    where: (o, { and: a, eq: e }) => a(e(o.customerId, customer.id), e(o.status, "PAID")),
    with: {
      items: { columns: { productName: true, quantity: true, lineTotal: true } },
    },
    orderBy: (o, { desc }) => [desc(o.paidAt)],
    limit: 5,
  });

  return { customer: toPublicCustomer(customer), recentOrders };
}

// ─── Send receipt to email ────────────────────────────────────────────────────

export async function sendReceiptEmail(orderPublicId: string, emailOverride?: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.publicId, orderPublicId),
    with: {
      items: true,
      customer: { columns: { publicId: true, name: true, email: true } },
      table:    { columns: { tableNumber: true } },
    },
  });

  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  if (order.status !== "PAID") throw Object.assign(new Error("Order is not paid yet"), { status: 422 });

  const toEmail = emailOverride ?? order.customer?.email ?? null;
  if (!toEmail) throw Object.assign(new Error("No email address available for this order"), { status: 422 });

  // Build receipt snapshot
  const receiptNumber = await generateReceiptNumber(order.id);
  const receiptData = {
    receiptNumber,
    orderNumber:    order.orderNumber,
    paidAt:         order.paidAt,
    tableNumber:    order.table?.tableNumber ?? null,
    customerName:   order.customer?.name ?? order.guestName ?? "Guest",
    items: order.items.map(i => ({
      name:      i.productName,
      qty:       i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
    subtotal:       order.subtotal,
    taxAmount:      order.taxAmount,
    discountAmount: order.discountAmount,
    grandTotal:     order.grandTotal,
  };

  // Upsert receipt record
  const existingReceipt = await db.query.receipts.findFirst({
    where: eq(receipts.orderId, order.id),
  });

  if (existingReceipt) {
    await db.update(receipts)
      .set({
        isEmailSent:  true,
        emailSentAt:  new Date(),
        emailAddress: toEmail,
        receiptData:  JSON.stringify(receiptData),
        updatedAt:    new Date(),
      })
      .where(eq(receipts.id, existingReceipt.id));
  } else {
    await db.insert(receipts).values({
      orderId:      order.id,
      receiptNumber,
      isEmailSent:  true,
      emailSentAt:  new Date(),
      emailAddress: toEmail,
      receiptData:  JSON.stringify(receiptData),
    });
  }

  // ── Actual email send ──────────────────────────────────────────────────────
  // Nodemailer / SendGrid / Resend can be plugged in here.
  // For now we log the payload — replace with your email provider call.
  console.log(`[receipt] Sending receipt ${receiptNumber} to ${toEmail}`);
  console.log(`[receipt] Payload:`, JSON.stringify(receiptData, null, 2));

  // Example Nodemailer stub (uncomment + install nodemailer when ready):
  //
  // import nodemailer from "nodemailer";
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({
  //   from: process.env["SMTP_FROM"] ?? "noreply@cafe.com",
  //   to: toEmail,
  //   subject: `Your receipt — ${receiptNumber}`,
  //   html: buildReceiptHtml(receiptData),
  // });

  return { sent: true, to: toEmail, receiptNumber };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function toPublicCustomer(c: any) {
  return { id: c.publicId, name: c.name, email: c.email, phone: c.phone };
}
