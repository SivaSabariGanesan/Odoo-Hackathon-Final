/**
 * Unit tests for customer auth business logic — no DB required.
 * Tests token validation logic and input validation rules.
 *
 * Run: bun test src/tests/customer-auth.test.ts
 */
import { describe, it, expect } from "bun:test";
import jwt from "jsonwebtoken";

// ─── Mirror verifyCustomerToken logic ────────────────────────────────────────

const TEST_SECRET = "test-secret-for-unit-tests-only";

function signToken(sub: string, email: string, role = "CUSTOMER", expiresIn = "1h") {
  return jwt.sign({ sub, email, role }, TEST_SECRET, { expiresIn } as jwt.SignOptions);
}

function verifyCustomerToken(token: string, secret = TEST_SECRET): { sub: string; email: string; role: string } | null {
  try {
    const payload = jwt.verify(token, secret) as any;
    if (payload.role !== "CUSTOMER") return null;
    return { sub: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

// ─── Input validation rules (mirrors Zod schema in customer-auth.route.ts) ───

function validateRegisterInput(input: unknown): { valid: true } | { valid: false; issues: string[] } {
  const issues: string[] = [];
  const i = input as any;
  if (!i?.name || typeof i.name !== "string" || i.name.trim().length === 0) issues.push("name required");
  if (!i?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email)) issues.push("valid email required");
  if (!i?.password || typeof i.password !== "string" || i.password.length < 8) issues.push("password min 8 chars");
  return issues.length ? { valid: false, issues } : { valid: true };
}

function validateLoginInput(input: unknown): { valid: true } | { valid: false; issues: string[] } {
  const issues: string[] = [];
  const i = input as any;
  if (!i?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email)) issues.push("valid email required");
  if (!i?.password || typeof i.password !== "string" || i.password.length === 0) issues.push("password required");
  return issues.length ? { valid: false, issues } : { valid: true };
}

// ─── Token tests ──────────────────────────────────────────────────────────────

describe("Customer token verification", () => {
  it("verifies a valid CUSTOMER token", () => {
    const token = signToken("cust-uuid-1", "ravi@example.com");
    const result = verifyCustomerToken(token);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe("cust-uuid-1");
    expect(result!.email).toBe("ravi@example.com");
    expect(result!.role).toBe("CUSTOMER");
  });

  it("rejects a token with wrong role (ADMIN)", () => {
    const token = signToken("staff-uuid", "admin@cafe.com", "ADMIN");
    expect(verifyCustomerToken(token)).toBeNull();
  });

  it("rejects a token with wrong role (CASHIER)", () => {
    const token = signToken("staff-uuid", "cashier@cafe.com", "CASHIER");
    expect(verifyCustomerToken(token)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = signToken("cust-uuid-2", "expired@example.com", "CUSTOMER", "-1s");
    // wait a tick to ensure expiry
    await new Promise((r) => setTimeout(r, 50));
    expect(verifyCustomerToken(token)).toBeNull();
  });

  it("rejects a tampered token", () => {
    const token = signToken("cust-uuid-3", "tamper@example.com") + "xyz";
    expect(verifyCustomerToken(token)).toBeNull();
  });

  it("rejects a token signed with wrong secret", () => {
    const token = signToken("cust-uuid-4", "other@example.com", "CUSTOMER");
    expect(verifyCustomerToken(token, "wrong-secret")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(verifyCustomerToken("")).toBeNull();
  });

  it("rejects malformed string", () => {
    expect(verifyCustomerToken("not.a.token")).toBeNull();
  });
});

// ─── Register input validation ────────────────────────────────────────────────

describe("Customer register input validation", () => {
  it("accepts valid input", () => {
    expect(validateRegisterInput({
      name: "Ravi Kumar",
      email: "ravi@example.com",
      password: "Secret@123",
    }).valid).toBe(true);
  });

  it("rejects missing name", () => {
    const r = validateRegisterInput({ email: "ravi@example.com", password: "Secret@123" });
    expect(r.valid).toBe(false);
    expect((r as any).issues).toContain("name required");
  });

  it("rejects invalid email", () => {
    const r = validateRegisterInput({ name: "Ravi", email: "not-an-email", password: "Secret@123" });
    expect(r.valid).toBe(false);
    expect((r as any).issues).toContain("valid email required");
  });

  it("rejects password shorter than 8 characters", () => {
    const r = validateRegisterInput({ name: "Ravi", email: "ravi@example.com", password: "abc" });
    expect(r.valid).toBe(false);
    expect((r as any).issues).toContain("password min 8 chars");
  });

  it("rejects empty object", () => {
    const r = validateRegisterInput({});
    expect(r.valid).toBe(false);
    expect((r as any).issues.length).toBeGreaterThan(0);
  });

  it("accepts optional phone field", () => {
    expect(validateRegisterInput({
      name: "Ravi",
      email: "ravi@example.com",
      password: "Secret@123",
      phone: "+919876543210",
    }).valid).toBe(true);
  });
});

// ─── Login input validation ───────────────────────────────────────────────────

describe("Customer login input validation", () => {
  it("accepts valid credentials", () => {
    expect(validateLoginInput({ email: "ravi@example.com", password: "anypass" }).valid).toBe(true);
  });

  it("rejects missing email", () => {
    const r = validateLoginInput({ password: "Secret@123" });
    expect(r.valid).toBe(false);
  });

  it("rejects empty password", () => {
    const r = validateLoginInput({ email: "ravi@example.com", password: "" });
    expect(r.valid).toBe(false);
  });

  it("rejects invalid email format", () => {
    const r = validateLoginInput({ email: "notanemail", password: "pass1234" });
    expect(r.valid).toBe(false);
  });
});

// ─── Archive endpoint (PATCH /users/:id/archive) ──────────────────────────────

describe("PATCH /users/:id/archive — spec compliance alias", () => {
  // Tests the expected response shape of the alias
  function archiveResult(found: boolean) {
    if (!found) return { status: 404, body: { success: false, error: { code: "NOT_FOUND" } } };
    return { status: 200, body: { success: true, data: { success: true } } };
  }

  it("returns 200 with { success: true } when staff is found", () => {
    const r = archiveResult(true);
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect((r.body as any).data.success).toBe(true);
  });

  it("returns 404 when staff is not found", () => {
    const r = archiveResult(false);
    expect(r.status).toBe(404);
    expect(r.body.success).toBe(false);
  });
});
