import { eq, and, isNull, sql } from "drizzle-orm";
import crypto from "crypto";
import { db } from "../db/index.ts";
import {
  orders,
  paymentMethods,
  paymentTransactions,
  paymentWebhookEvents,
  payments,
  receipts,
  floorTables,
  auditLogs,
  paymentProviderConfigs,
} from "../db/schema/index.ts";
import { decrypt } from "../utils/encrypt.ts";
import { emit } from "../utils/events.ts";
import { emitTableOccupancyChanged } from "./floor.service.ts";
import { markOrderPaid } from "./order.service.ts";
import type {
  CashPaymentInput,
  CardPaymentInput,
} from "../validators/payments.validator.ts";

// ─── Audit helper ─────────────────────────────────────────────────────────────

async function audit(params: {
  actorId?: bigint;
  action: "CREATE" | "UPDATE" | "PAYMENT" | "CANCEL";
  entityId: bigint;
  description: string;
  oldValue?: object;
  newValue?: object;
}) {
  await db.insert(auditLogs).values({
    actorId:     params.actorId,
    action:      params.action,
    entityType:  "payment_transaction",
    entityId:    params.entityId,
    oldValue:    params.oldValue  ? JSON.stringify(params.oldValue)  : undefined,
    newValue:    params.newValue  ? JSON.stringify(params.newValue)  : undefined,
    description: params.description,
  });
}

// ─── Order validation guard ───────────────────────────────────────────────────
// Shared pre-flight for all payment endpoints.

async function validateOrderForPayment(orderPublicId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.publicId, orderPublicId),
    with: { table: true },
  });

  if (!order) {
    throw Object.assign(new Error("Order not found"), { status: 404, code: "ORDER_NOT_FOUND" });
  }

  const allowedStatuses = ["DRAFT", "READY", "PAYMENT_PENDING"];
  if (!allowedStatuses.includes(order.status)) {
    throw Object.assign(
      new Error(`Order status "${order.status}" is not eligible for payment. Allowed: DRAFT, READY, PAYMENT_PENDING`),
      { status: 422, code: "ORDER_STATUS_INVALID" },
    );
  }

  if (Number(order.grandTotal) <= 0) {
    throw Object.assign(
      new Error("Order grand total must be greater than zero"),
      { status: 422, code: "ORDER_AMOUNT_INVALID" },
    );
  }

  // Table must be active (not archived/removed)
  if (order.tableId && order.table && !(order.table as any).isActive) {
    throw Object.assign(
      new Error("The table linked to this order is inactive"),
      { status: 422, code: "TABLE_INACTIVE" },
    );
  }

  return order;
}

// ─── 1. Create Payment Order ──────────────────────────────────────────────────
// Entry point for all checkout flows. Creates a PENDING transaction.

export async function createPaymentOrder(
  orderPublicId: string,
  paymentMethodPublicId: string,
  actorId: bigint,
) {
  const order = await validateOrderForPayment(orderPublicId);

  // Validate payment method (Rule 2)
  const method = await db.query.paymentMethods.findFirst({
    where: eq(paymentMethods.publicId, paymentMethodPublicId),
  });
  if (!method) {
    throw Object.assign(new Error("Payment method not found"), { status: 404, code: "PAYMENT_METHOD_NOT_FOUND" });
  }
  if (!method.isEnabled) {
    throw Object.assign(new Error("This payment method is currently disabled"), { status: 422, code: "PAYMENT_METHOD_DISABLED" });
  }

  // Rule 3: Cashfree requires active provider config
  if (method.type === "CASHFREE") {
    const config = await db.query.paymentProviderConfigs.findFirst({
      where: eq(paymentProviderConfigs.providerName, "CASHFREE"),
    });
    if (!config?.isEnabled) {
      throw Object.assign(
        new Error("Cashfree provider is not configured or disabled"),
        { status: 422, code: "CASHFREE_NOT_CONFIGURED" },
      );
    }
  }

  // Move order to PAYMENT_PENDING
  await db.update(orders)
    .set({ status: "PAYMENT_PENDING", updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  const [txn] = await db.insert(paymentTransactions).values({
    orderId:  order.id,
    methodId: method.id,
    amount:   order.grandTotal,
    status:   "PENDING",
  }).returning();

  await audit({
    actorId,
    action:      "CREATE",
    entityId:    txn.id,
    description: `Payment order created for order ${order.orderNumber} via ${method.name}`,
    newValue:    { orderId: order.publicId, method: method.name, amount: order.grandTotal, status: "PENDING" },
  });

  emit("payment_order_created", {
    transactionId: txn.publicId,
    orderId:       order.publicId,
    amount:        txn.amount,
    method:        method.type,
  });

  return {
    transactionId: txn.publicId,
    status:        txn.status,
    amount:        txn.amount,
    method:        method.name,
    methodType:    method.type,
  };
}

// ─── 2. Cash Payment ──────────────────────────────────────────────────────────

export async function processCashPayment(
  orderPublicId: string,
  input: CashPaymentInput,
  actorId: bigint,
) {
  return db.transaction(async (tx) => {
    // Row-level lock — prevents two cashiers paying the same order
    const lockResult = await tx.execute(
      sql`SELECT id, status, grand_total, public_id, order_number FROM orders WHERE public_id = ${orderPublicId} FOR UPDATE`,
    );
    const lockedOrder = lockResult.rows[0] as any;
    if (!lockedOrder) throw Object.assign(new Error("Order not found"), { status: 404 });
    if (lockedOrder.status === "PAID") throw Object.assign(new Error("Order already paid"), { status: 409, code: "ORDER_ALREADY_PAID" });

    // Load transaction
    const txn = await tx.query.paymentTransactions.findFirst({
      where: eq(paymentTransactions.publicId, input.transactionId),
    });
    if (!txn) throw Object.assign(new Error("Transaction not found"), { status: 404 });
    if (txn.status !== "PENDING") throw Object.assign(new Error("Transaction is not in PENDING state"), { status: 409 });

    const grandTotal = Number(lockedOrder.grand_total);
    const received   = input.receivedAmount;

    if (received < grandTotal) {
      // Mark transaction failed
      await tx.update(paymentTransactions)
        .set({ status: "FAILED", failureReason: `Received ₹${received} < total ₹${grandTotal}`, updatedAt: new Date() })
        .where(eq(paymentTransactions.id, txn.id));

      await audit({
        actorId, action: "UPDATE", entityId: txn.id,
        description: "Cash payment failed — insufficient amount",
        oldValue: { status: "PENDING" },
        newValue: { status: "FAILED", received, grandTotal },
      });

      throw Object.assign(
        new Error(`Insufficient cash. Received ₹${received}, required ₹${grandTotal}`),
        { status: 422, code: "INSUFFICIENT_CASH" },
      );
    }

    const change = Number((received - grandTotal).toFixed(2));

    // Finalize transaction
    const [updatedTxn] = await tx.update(paymentTransactions)
      .set({
        status: "SUCCESS", receivedAmount: received.toFixed(2),
        changeAmount: change.toFixed(2), paidAt: new Date(), updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, txn.id))
      .returning();

    // Create payments record
    await tx.insert(payments).values({
      orderId: lockedOrder.id, methodId: txn.methodId, transactionId: txn.id,
      amount: grandTotal.toFixed(2), changeAmount: change.toFixed(2), status: "SUCCESS", paidAt: new Date(),
    });

    await audit({
      actorId, action: "PAYMENT", entityId: txn.id,
      description: `Cash payment SUCCESS for order ${lockedOrder.order_number}`,
      oldValue: { status: "PENDING" },
      newValue: { status: "SUCCESS", received, change },
    });

    return { transaction: updatedTxn, change, grandTotal };
  }).then(async (result) => {
    // Mark order paid outside inner transaction (uses its own db.transaction internally)
    await markOrderPaid(result.transaction.orderId, {});
    await _generateReceipt(result.transaction.orderId);
    emit("payment_success", { transactionId: result.transaction.publicId, method: "CASH" });
    return result;
  });
}

// ─── 3. Card Payment ──────────────────────────────────────────────────────────

export async function processCardPayment(
  orderPublicId: string,
  input: CardPaymentInput,
  actorId: bigint,
) {
  return db.transaction(async (tx) => {
    const lockResult = await tx.execute(
      sql`SELECT id, status, grand_total, public_id, order_number FROM orders WHERE public_id = ${orderPublicId} FOR UPDATE`,
    );
    const lockedOrder = lockResult.rows[0] as any;
    if (!lockedOrder) throw Object.assign(new Error("Order not found"), { status: 404 });
    if (lockedOrder.status === "PAID") throw Object.assign(new Error("Order already paid"), { status: 409, code: "ORDER_ALREADY_PAID" });

    // Duplicate reference check — prevent same card ref being used twice
    const dupRef = await tx.query.paymentTransactions.findFirst({
      where: eq(paymentTransactions.paymentReference, input.transactionReference),
    });
    if (dupRef) {
      throw Object.assign(
        new Error("Duplicate transaction reference"),
        { status: 409, code: "DUPLICATE_TRANSACTION_REFERENCE" },
      );
    }

    const txn = await tx.query.paymentTransactions.findFirst({
      where: eq(paymentTransactions.publicId, input.transactionId),
    });
    if (!txn) throw Object.assign(new Error("Transaction not found"), { status: 404 });
    if (txn.status !== "PENDING") throw Object.assign(new Error("Transaction is not in PENDING state"), { status: 409 });

    const [updatedTxn] = await tx.update(paymentTransactions)
      .set({
        status: "SUCCESS", paymentReference: input.transactionReference,
        paidAt: new Date(), updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, txn.id))
      .returning();

    await tx.insert(payments).values({
      orderId: lockedOrder.id, methodId: txn.methodId, transactionId: txn.id,
      amount: lockedOrder.grand_total, transactionRef: input.transactionReference,
      status: "SUCCESS", paidAt: new Date(),
    });

    await audit({
      actorId, action: "PAYMENT", entityId: txn.id,
      description: `Card payment SUCCESS for order ${lockedOrder.order_number}`,
      newValue: { status: "SUCCESS", ref: input.transactionReference },
    });

    return { transaction: updatedTxn };
  }).then(async (result) => {
    await markOrderPaid(result.transaction.orderId, {});
    await _generateReceipt(result.transaction.orderId);
    emit("payment_success", { transactionId: result.transaction.publicId, method: "CARD" });
    return result;
  });
}

// ─── 4. Cashfree — Create Order ───────────────────────────────────────────────
// Returns cashfree_order_id + payment_session_id for the frontend SDK.

export async function createCashfreeOrder(
  orderPublicId: string,
  transactionPublicId: string,
  actorId: bigint,
) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.publicId, orderPublicId),
  });
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });

  const txn = await db.query.paymentTransactions.findFirst({
    where: eq(paymentTransactions.publicId, transactionPublicId),
  });
  if (!txn) throw Object.assign(new Error("Transaction not found"), { status: 404 });
  if (txn.status !== "PENDING") throw Object.assign(new Error("Transaction not pending"), { status: 409 });

  // Load Cashfree config and decrypt secrets
  const config = await db.query.paymentProviderConfigs.findFirst({
    where: eq(paymentProviderConfigs.providerName, "CASHFREE"),
  });
  if (!config?.isEnabled || !config.clientId || !config.clientSecret) {
    throw Object.assign(new Error("Cashfree not configured"), { status: 422, code: "CASHFREE_NOT_CONFIGURED" });
  }

  const clientId     = decrypt(config.clientId);
  const clientSecret = decrypt(config.clientSecret);
  const isSandbox    = config.environment === "SANDBOX";
  const baseUrl      = isSandbox
    ? "https://sandbox.cashfree.com/pg"
    : "https://api.cashfree.com/pg";

  // Idempotency key — same key = Cashfree returns same order (no duplicate)
  const idempotencyKey = `${order.orderNumber}-${txn.publicId}`;

  const cashfreePayload = {
    order_id:       idempotencyKey,
    order_amount:   Number(order.grandTotal),
    order_currency: "INR",
    customer_details: {
      customer_id:    `order_${order.publicId}`,
      customer_phone: "9999999999",                                  // placeholder — replace with real customer if linked
    },
  };

  const response = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-client-id":       clientId,
      "x-client-secret":   clientSecret,
      "x-api-version":     "2023-08-01",
      "x-idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(cashfreePayload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw Object.assign(
      new Error(`Cashfree order creation failed: ${error}`),
      { status: 502, code: "CASHFREE_API_ERROR" },
    );
  }

  const cfData = await response.json() as {
    cf_order_id: string;
    payment_session_id: string;
    order_status: string;
  };

  // Store Cashfree order details on the transaction
  await db.update(paymentTransactions)
    .set({
      cashfreeOrderId:   cfData.cf_order_id,
      paymentSessionId:  cfData.payment_session_id,
      idempotencyKey,
      updatedAt:         new Date(),
    })
    .where(eq(paymentTransactions.id, txn.id));

  await audit({
    actorId, action: "UPDATE", entityId: txn.id,
    description: `Cashfree order created: ${cfData.cf_order_id}`,
    newValue: { cashfreeOrderId: cfData.cf_order_id, status: "PENDING" },
  });

  return {
    transactionId:    txn.publicId,
    cashfreeOrderId:  cfData.cf_order_id,
    paymentSessionId: cfData.payment_session_id,
    environment:      config.environment,
  };
}

// ─── 5. Cashfree Webhook ──────────────────────────────────────────────────────
// Called by Cashfree. Raw body is used for signature verification.

export async function handleCashfreeWebhook(
  rawBody: string,
  signature: string,
  timestamp: string,
) {
  // ── Signature verification ───────────────────────────────────────────────
  const config = await db.query.paymentProviderConfigs.findFirst({
    where: eq(paymentProviderConfigs.providerName, "CASHFREE"),
  });
  if (!config?.webhookSecret) {
    throw Object.assign(new Error("Webhook secret not configured"), { status: 500 });
  }

  const webhookSecret = decrypt(config.webhookSecret);

  // Cashfree signature: HMAC-SHA256 of (timestamp + rawBody)
  const expectedSig = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");

  if (expectedSig !== signature) {
    throw Object.assign(new Error("Invalid webhook signature"), { status: 401, code: "INVALID_SIGNATURE" });
  }

  // ── Timestamp replay protection (reject > 5 min old) ────────────────────
  const eventTime   = Number(timestamp) * 1000;
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() - eventTime > fiveMinutes) {
    throw Object.assign(new Error("Webhook timestamp expired"), { status: 401, code: "EXPIRED_TIMESTAMP" });
  }

  const payload = JSON.parse(rawBody);
  const eventType = payload?.type ?? payload?.event_type ?? "UNKNOWN";
  const cfPaymentId = String(payload?.data?.payment?.cf_payment_id ?? payload?.cf_payment_id ?? "");
  const cfOrderId   = String(payload?.data?.order?.cf_order_id    ?? payload?.cf_order_id   ?? "");

  if (!cfPaymentId) {
    throw Object.assign(new Error("Missing webhook ID"), { status: 400 });
  }

  // ── Idempotency — process each webhook exactly once ──────────────────────
  const alreadyProcessed = await db.query.paymentWebhookEvents.findFirst({
    where: eq(paymentWebhookEvents.webhookId, cfPaymentId),
  });
  if (alreadyProcessed) {
    return { status: "already_processed", webhookId: cfPaymentId };
  }

  // Find the matching transaction by cashfree_order_id
  const txn = await db.query.paymentTransactions.findFirst({
    where: eq(paymentTransactions.cashfreeOrderId, cfOrderId),
  });

  // Record the event (even if txn not found — for audit)
  await db.insert(paymentWebhookEvents).values({
    webhookId:     cfPaymentId,
    transactionId: txn?.id ?? null,
    eventType,
    rawPayload:    rawBody,
  });

  if (!txn) {
    return { status: "transaction_not_found", webhookId: cfPaymentId };
  }

  // ── Handle event types ────────────────────────────────────────────────────
  if (eventType === "PAYMENT_SUCCESS") {
    if (txn.status === "SUCCESS") {
      return { status: "already_paid", webhookId: cfPaymentId };
    }

    await db.update(paymentTransactions)
      .set({
        status: "SUCCESS", paymentReference: cfPaymentId,
        paidAt: new Date(), updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, txn.id));

    await db.insert(payments).values({
      orderId: txn.orderId, methodId: txn.methodId, transactionId: txn.id,
      amount: txn.amount, transactionRef: cfPaymentId,
      gatewayResponse: rawBody, status: "SUCCESS", paidAt: new Date(),
    });

    await markOrderPaid(txn.orderId, {});
    await _generateReceipt(txn.orderId);

    await audit({
      action: "PAYMENT", entityId: txn.id,
      description: `Cashfree PAYMENT_SUCCESS via webhook — cf_payment_id: ${cfPaymentId}`,
      newValue: { status: "SUCCESS", cfPaymentId },
    });

    emit("payment_success", { transactionId: txn.publicId, method: "CASHFREE" });
    return { status: "success", webhookId: cfPaymentId };
  }

  if (["PAYMENT_FAILED", "PAYMENT_CANCELLED", "PAYMENT_EXPIRED"].includes(eventType)) {
    const failStatus = eventType === "PAYMENT_FAILED"    ? "FAILED"    :
                       eventType === "PAYMENT_CANCELLED" ? "CANCELLED" : "EXPIRED";

    await db.update(paymentTransactions)
      .set({
        status:        failStatus as any,
        failureReason: eventType,
        updatedAt:     new Date(),
      })
      .where(eq(paymentTransactions.id, txn.id));

    // Order goes back to READY so cashier can retry
    await db.update(orders)
      .set({ status: "READY", updatedAt: new Date() })
      .where(eq(orders.id, txn.orderId));

    await audit({
      action: "UPDATE", entityId: txn.id,
      description: `Cashfree ${eventType} via webhook`,
      oldValue: { status: "PENDING" },
      newValue: { status: failStatus },
    });

    emit("payment_failed", { transactionId: txn.publicId, reason: eventType });
    return { status: "failed", webhookId: cfPaymentId };
  }

  return { status: "unhandled_event", eventType, webhookId: cfPaymentId };
}

// ─── Internal: generate receipt ───────────────────────────────────────────────

async function _generateReceipt(orderId: bigint) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true, table: true, customer: true },
  });
  if (!order) return;

  const receiptNumber = `RCP-${order.orderNumber}`;

  // Check if receipt already exists
  const existing = await db.query.receipts.findFirst({
    where: eq(receipts.orderId, orderId),
  });
  if (existing) return existing;

  const receiptData = JSON.stringify({
    receiptNumber,
    orderNumber:  order.orderNumber,
    items:        (order as any).items,
    grandTotal:   order.grandTotal,
    paidAt:       order.paidAt,
    generatedAt:  new Date().toISOString(),
  });

  const [receipt] = await db.insert(receipts).values({
    orderId, receiptNumber, receiptData,
  }).returning();

  emit("receipt_generated", { receiptId: receipt.publicId, orderId: order.publicId });
  return receipt;
}
