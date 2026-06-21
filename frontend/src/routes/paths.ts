export const ROUTES = {
  LOGIN: "/",
  SIGNUP: "/signup",

  // Employee
  POS_SESSION: "/employee/session",
  POS_ORDER: "/employee/order",
  TABLE_VIEW: "/employee/tables",
  ORDERS: "/employee/orders",
  EDIT_ORDER: "/employee/orders/:id/edit",
  CUSTOMERS: "/employee/customers",

  // Admin
  ADMIN_DASHBOARD: "/admin/dashboard",
  PRODUCTS: "/admin/products",
  CATEGORIES: "/admin/categories",
  PAYMENTS: "/admin/payments",
  COUPONS: "/admin/coupons",
  EMPLOYEES: "/admin/employees",
  REPORTS: "/admin/reports",
  FLOOR_TABLES: "/admin/floor-tables",

  // User
  USER_DASHBOARD: "/user/dashboard",

  // Kitchen
  KDS: "/kitchen",

  // Customer Display
  CUSTOMER_ORDER: "/customer-display/order",
  CUSTOMER_PAYMENT: "/customer-display/payment",
  CUSTOMER_COMPLETE: "/customer-display/completion",

  // Self Ordering
  SELF_ORDER_SETTINGS: "/self-order/settings",
  QR_GENERATOR: "/self-order/qr",
  SPLASH: "/self-order/splash",
  PRODUCT_BROWSE: "/self-order/products",
  CART: "/self-order/cart",
  ORDER_CONFIRMED: "/self-order/confirmed",
  TRACK_ORDER: "/self-order/track",
};