import bcrypt from "bcrypt";
import { authConfig } from "../config/auth.ts";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, authConfig.bcrypt.rounds);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function isStrongPassword(password: string): boolean {
  return authConfig.password.regex.test(password);
}
