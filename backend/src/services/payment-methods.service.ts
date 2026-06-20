import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { paymentMethods, paymentProviderConfigs, auditLogs } from "../db/schema/index.ts";
import { encrypt, decrypt } from "../utils/encrypt.ts";
import type {
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
  UpdateCashfreeConfigInput,
} from "../validators/payment-methods.validator.ts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function writeAudit(params: {
  actorId: bigint;
  action: "CREATE" | "UPDATE";
  entityId: bigint;
  oldValue?: object;
  newValue?: object;
  description: string;
}) {
  await db.insert(auditLogs).values({
    actorId:    params.actorId,
    action:     params.action,
    entityType: "payment_method",
    entityId:   params.entityId,
    oldValue:   params.oldValue ? JSON.stringify(params.oldValue) : undefined,
    newValue:   params.newValue ? JSON.stringify(params.newValue) : undefined,
    description: params.description,
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listPaymentMethods(params: {
  type?:      "CASH" | "CARD" | "CASHFREE";
  isEnabled?: boolean;
  search?:    string;
}) {
  const rows = await db.query.paymentMethods.findMany({
    where: (pm, { and, eq, ilike }) => {
      const conditions: any[] = [];
      if (params.type      !== undefined) conditions.push(eq(pm.type, params.type));
      if (params.isEnabled !== undefined) conditions.push(eq(pm.isEnabled, params.isEnabled));
      if (params.search)                  conditions.push(ilike(pm.name, `%${params.search}%`));
      return conditions.length ? and(...conditions) : undefined;
    },
    orderBy: (pm) => [pm.name],
  });
  return rows;
}

// ─── Get by public ID ─────────────────────────────────────────────────────────

export async function getPaymentMethod(publicId: string) {
  return db.query.paymentMethods.findFirst({
    where: (pm, { eq }) => eq(pm.publicId, publicId),
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPaymentMethod(
  input: CreatePaymentMethodInput,
  actorId: bigint,
) {
  console.log('[PaymentMethod] Creating with input:', input);
  console.log('[PaymentMethod] Actor ID:', actorId);
  
  // Duplicate name check
  const existing = await db.query.paymentMethods.findFirst({
    where: (pm, { eq }) => eq(pm.name, input.name),
    columns: { id: true },
  });
  if (existing) {
    console.log('[PaymentMethod] Duplicate name found:', input.name);
    throw Object.assign(new Error("Payment method name already exists"), { status: 409 });
  }

  console.log('[PaymentMethod] Inserting into database...');
  const [row] = await db
    .insert(paymentMethods)
    .values({ name: input.name, type: input.type, isEnabled: input.isEnabled })
    .returning();

  console.log('[PaymentMethod] Inserted row:', row);

  await writeAudit({
    actorId,
    action:      "CREATE",
    entityId:    row.id,
    newValue:    { name: row.name, type: row.type, isEnabled: row.isEnabled },
    description: `Payment method "${row.name}" created`,
  });

  console.log('[PaymentMethod] Audit log written');

  return row;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePaymentMethod(
  publicId: string,
  input: UpdatePaymentMethodInput,
  actorId: bigint,
) {
  const existing = await db.query.paymentMethods.findFirst({
    where: (pm, { eq }) => eq(pm.publicId, publicId),
  });
  if (!existing) throw Object.assign(new Error("Payment method not found"), { status: 404 });

  // Duplicate name check (skip if name unchanged)
  if (input.name && input.name !== existing.name) {
    const nameConflict = await db.query.paymentMethods.findFirst({
      where: (pm, { eq }) => eq(pm.name, input.name!),
      columns: { id: true },
    });
    if (nameConflict) {
      throw Object.assign(new Error("Payment method name already exists"), { status: 409 });
    }
  }

  const [updated] = await db
    .update(paymentMethods)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(paymentMethods.publicId, publicId))
    .returning();

  await writeAudit({
    actorId,
    action:      "UPDATE",
    entityId:    existing.id,
    oldValue:    { name: existing.name, isEnabled: existing.isEnabled },
    newValue:    { name: updated.name, isEnabled: updated.isEnabled },
    description: `Payment method "${existing.name}" updated`,
  });

  return updated;
}

// ─── Enable ───────────────────────────────────────────────────────────────────

export async function enablePaymentMethod(publicId: string, actorId: bigint) {
  const existing = await db.query.paymentMethods.findFirst({
    where: (pm, { eq }) => eq(pm.publicId, publicId),
  });
  if (!existing) throw Object.assign(new Error("Payment method not found"), { status: 404 });

  const [updated] = await db
    .update(paymentMethods)
    .set({ isEnabled: true, updatedAt: new Date() })
    .where(eq(paymentMethods.publicId, publicId))
    .returning();

  await writeAudit({
    actorId,
    action:      "UPDATE",
    entityId:    existing.id,
    oldValue:    { isEnabled: false },
    newValue:    { isEnabled: true },
    description: `Payment method "${existing.name}" enabled`,
  });

  return updated;
}

// ─── Disable ──────────────────────────────────────────────────────────────────

export async function disablePaymentMethod(publicId: string, actorId: bigint) {
  const existing = await db.query.paymentMethods.findFirst({
    where: (pm, { eq }) => eq(pm.publicId, publicId),
  });
  if (!existing) throw Object.assign(new Error("Payment method not found"), { status: 404 });

  // Business Rule 1: at least one method must remain enabled
  const enabledCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paymentMethods)
    .where(eq(paymentMethods.isEnabled, true));

  if ((enabledCount[0]?.count ?? 0) <= 1 && existing.isEnabled) {
    throw Object.assign(
      new Error("Cannot disable the last enabled payment method. At least one must remain enabled."),
      { status: 422 },
    );
  }

  const [updated] = await db
    .update(paymentMethods)
    .set({ isEnabled: false, updatedAt: new Date() })
    .where(eq(paymentMethods.publicId, publicId))
    .returning();

  await writeAudit({
    actorId,
    action:      "UPDATE",
    entityId:    existing.id,
    oldValue:    { isEnabled: true },
    newValue:    { isEnabled: false },
    description: `Payment method "${existing.name}" disabled`,
  });

  return updated;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePaymentMethod(publicId: string, actorId: bigint) {
  const existing = await db.query.paymentMethods.findFirst({
    where: (pm, { eq }) => eq(pm.publicId, publicId),
  });
  if (!existing) throw Object.assign(new Error("Payment method not found"), { status: 404 });

  // Block if it's the last enabled method
  if (existing.isEnabled) {
    const enabledCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentMethods)
      .where(eq(paymentMethods.isEnabled, true));

    if ((enabledCount[0]?.count ?? 0) <= 1) {
      throw Object.assign(
        new Error("Cannot delete the last enabled payment method."),
        { status: 422 },
      );
    }
  }

  await db.delete(paymentMethods).where(eq(paymentMethods.publicId, publicId));

  await writeAudit({
    actorId,
    action:      "UPDATE",
    entityId:    existing.id,
    oldValue:    { name: existing.name, type: existing.type },
    description: `Payment method "${existing.name}" deleted`,
  });
}

// ─── Cashfree config: GET ─────────────────────────────────────────────────────
// Secrets are never returned — only metadata

export async function getCashfreeConfig() {
  const row = await db.query.paymentProviderConfigs.findFirst({
    where: (p, { eq }) => eq(p.providerName, "CASHFREE"),
  });
  if (!row) return null;

  return {
    publicId:    row.publicId,
    providerName: row.providerName,
    environment: row.environment,
    isEnabled:   row.isEnabled,
    hasClientId:      !!row.clientId,
    hasClientSecret:  !!row.clientSecret,
    hasWebhookSecret: !!row.webhookSecret,
    createdAt:   row.createdAt,
    updatedAt:   row.updatedAt,
  };
}

// ─── Cashfree config: PATCH ───────────────────────────────────────────────────

export async function updateCashfreeConfig(
  input: UpdateCashfreeConfigInput,
  actorId: bigint,
) {
  const existing = await db.query.paymentProviderConfigs.findFirst({
    where: (p, { eq }) => eq(p.providerName, "CASHFREE"),
  });

  const values: Record<string, any> = { updatedAt: new Date() };

  // Encrypt secrets before storage
  if (input.clientId)      values.clientId      = encrypt(input.clientId);
  if (input.clientSecret)  values.clientSecret  = encrypt(input.clientSecret);
  if (input.webhookSecret) values.webhookSecret = encrypt(input.webhookSecret);
  if (input.environment)   values.environment   = input.environment;
  if (input.isEnabled !== undefined) values.isEnabled = input.isEnabled;

  let row;
  if (!existing) {
    // First-time setup — upsert
    [row] = await db
      .insert(paymentProviderConfigs)
      .values({ providerName: "CASHFREE", ...values })
      .returning();
  } else {
    [row] = await db
      .update(paymentProviderConfigs)
      .set(values)
      .where(eq(paymentProviderConfigs.providerName, "CASHFREE"))
      .returning();
  }

  await db.insert(auditLogs).values({
    actorId,
    action:      "UPDATE",
    entityType:  "payment_provider_config",
    entityId:    row.id,
    description: "Cashfree configuration updated",
    // Never log secret values
    newValue: JSON.stringify({
      environment: row.environment,
      isEnabled:   row.isEnabled,
    }),
  });

  return {
    publicId:         row.publicId,
    providerName:     row.providerName,
    environment:      row.environment,
    isEnabled:        row.isEnabled,
    hasClientId:      !!row.clientId,
    hasClientSecret:  !!row.clientSecret,
    hasWebhookSecret: !!row.webhookSecret,
    updatedAt:        row.updatedAt,
  };
}

// ─── Checkout validation (used by order/payment service) ─────────────────────

export async function assertPaymentMethodUsable(publicId: string) {
  const method = await db.query.paymentMethods.findFirst({
    where: (pm, { eq }) => eq(pm.publicId, publicId),
  });
  if (!method) {
    throw Object.assign(new Error("Payment method not found"), {
      status: 404, code: "PAYMENT_METHOD_NOT_FOUND",
    });
  }
  if (!method.isEnabled) {
    throw Object.assign(new Error("This payment method is currently disabled"), {
      status: 422, code: "PAYMENT_METHOD_DISABLED",
    });
  }
  // Rule 3: Cashfree requires active provider config
  if (method.type === "CASHFREE") {
    const config = await db.query.paymentProviderConfigs.findFirst({
      where: (p, { eq }) => eq(p.providerName, "CASHFREE"),
    });
    if (!config?.isEnabled) {
      throw Object.assign(new Error("Cashfree provider is not configured or disabled"), {
        status: 422, code: "CASHFREE_NOT_CONFIGURED",
      });
    }
  }
  return method;
}
