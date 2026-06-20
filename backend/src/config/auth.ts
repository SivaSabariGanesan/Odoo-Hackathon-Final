export const authConfig = {
  jwt: {
    secret:              process.env["JWT_SECRET"] ?? "change_me",
    accessTokenExpiry:   process.env["JWT_ACCESS_EXPIRY"]  ?? "15m",
    refreshTokenExpiry:  process.env["JWT_REFRESH_EXPIRY"] ?? "7d",
    refreshTokenExpiryMs: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },
  bcrypt: {
    rounds: Number(process.env["BCRYPT_ROUNDS"] ?? 12),
  },
  password: {
    minLength: 8,
    // at least 1 uppercase, 1 lowercase, 1 digit
    regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  },
} as const;
