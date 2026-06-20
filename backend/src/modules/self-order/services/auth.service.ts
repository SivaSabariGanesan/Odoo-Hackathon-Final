import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] || "fallback_secret_for_dev_only";
const JWT_EXPIRES_IN = "2h";

export class AuthService {
  generateCustomerToken(tableId: string | number) {
    return jwt.sign(
      { tableId: String(tableId), role: "CUSTOMER" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  verifyCustomerToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { tableId: string, role: string };
      if (decoded.role !== "CUSTOMER") return null;
      return decoded;
    } catch (e) {
      return null;
    }
  }
}

export const authService = new AuthService();
