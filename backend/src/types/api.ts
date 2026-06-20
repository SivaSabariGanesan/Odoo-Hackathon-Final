// ─── Shared API response types ────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

// ─── Error codes ──────────────────────────────────────────────────────────────

export const ErrorCode = {
  // Generic
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Order/Cart
  ORDER_NOT_DRAFT: "ORDER_NOT_DRAFT",
  ORDER_ALREADY_PAID: "ORDER_ALREADY_PAID",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  ITEM_LOCKED_BY_KDS: "ITEM_LOCKED_BY_KDS",
  DUPLICATE_DRAFT_ORDER: "DUPLICATE_DRAFT_ORDER",
  ORDER_CONCURRENT_MODIFICATION: "ORDER_CONCURRENT_MODIFICATION",

  // Promotions
  COUPON_NOT_FOUND: "COUPON_NOT_FOUND",
  COUPON_INACTIVE: "COUPON_INACTIVE",
  COUPON_EXPIRED: "COUPON_EXPIRED",
  COUPON_MAX_USES_REACHED: "COUPON_MAX_USES_REACHED",
  COUPON_NOT_ELIGIBLE: "COUPON_NOT_ELIGIBLE",

  // Products
  PRODUCT_IN_USE: "PRODUCT_IN_USE",
  INVALID_TAX_RATE: "INVALID_TAX_RATE",
  PRODUCT_UNAVAILABLE: "PRODUCT_UNAVAILABLE",

  // Staff
  STAFF_IN_USE: "STAFF_IN_USE",
  STAFF_ARCHIVED: "STAFF_ARCHIVED",

  // Session
  SESSION_ALREADY_OPEN: "SESSION_ALREADY_OPEN",
  SESSION_NOT_OPEN: "SESSION_NOT_OPEN",

  // KDS
  KDS_INVALID_STATE_TRANSITION: "KDS_INVALID_STATE_TRANSITION",

  // Table
  TABLE_OCCUPIED: "TABLE_OCCUPIED",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
