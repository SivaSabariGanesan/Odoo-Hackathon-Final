import { relations } from "drizzle-orm";
import { staffAccounts } from "./01_staff.ts";
import { productCategories, products } from "./02_products.ts";
import { paymentMethods } from "./03_payment_methods.ts";
import { floors, floorTables } from "./04_floor_tables.ts";
import { customers } from "./05_customers.ts";
import { promotions } from "./06_promotions.ts";
import { posSessions } from "./07_pos_sessions.ts";
import { orders, orderItems } from "./08_orders.ts";
import { payments, receipts } from "./09_payments_receipts.ts";
import { kitchenTickets, kitchenTicketItems } from "./10_kds.ts";
import { customerDisplaySessions } from "./11_customer_display.ts";

// staff
export const staffAccountsRelations = relations(staffAccounts, ({ many }) => ({
  openedSessions:  many(posSessions, { relationName: "openedBy" }),
  closedSessions:  many(posSessions, { relationName: "closedBy" }),
  orders:          many(orders),
}));

// product categories
export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
}));

// products
export const productsRelations = relations(products, ({ one, many }) => ({
  category:   one(productCategories, { fields: [products.categoryId], references: [productCategories.id] }),
  orderItems: many(orderItems),
}));

// floors
export const floorsRelations = relations(floors, ({ many }) => ({
  tables: many(floorTables),
}));

// floor tables
export const floorTablesRelations = relations(floorTables, ({ one, many }) => ({
  floor:          one(floors, { fields: [floorTables.floorId], references: [floors.id] }),
  orders:         many(orders),
  kitchenTickets: many(kitchenTickets),
}));

// customers
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

// promotions
export const promotionsRelations = relations(promotions, ({ many }) => ({
  orders: many(orders),
}));

// pos sessions
export const posSessionsRelations = relations(posSessions, ({ one, many }) => ({
  openedBy: one(staffAccounts, { fields: [posSessions.openedById], references: [staffAccounts.id], relationName: "openedBy" }),
  closedBy: one(staffAccounts, { fields: [posSessions.closedById], references: [staffAccounts.id], relationName: "closedBy" }),
  orders:   many(orders),
}));

// orders
export const ordersRelations = relations(orders, ({ one, many }) => ({
  session:        one(posSessions,  { fields: [orders.sessionId],   references: [posSessions.id] }),
  table:          one(floorTables,  { fields: [orders.tableId],     references: [floorTables.id] }),
  customer:       one(customers,    { fields: [orders.customerId],  references: [customers.id] }),
  staff:          one(staffAccounts,{ fields: [orders.staffId],     references: [staffAccounts.id] }),
  promotion:      one(promotions,   { fields: [orders.promotionId], references: [promotions.id] }),
  items:          many(orderItems),
  payments:       many(payments),
  receipts:       many(receipts),
  kitchenTickets: many(kitchenTickets),
}));

// order items
export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order:             one(orders,   { fields: [orderItems.orderId],    references: [orders.id] }),
  product:           one(products, { fields: [orderItems.productId],  references: [products.id] }),
  kitchenTicketItems: many(kitchenTicketItems),
}));

// payments
export const paymentsRelations = relations(payments, ({ one }) => ({
  order:  one(orders,         { fields: [payments.orderId],  references: [orders.id] }),
  method: one(paymentMethods, { fields: [payments.methodId], references: [paymentMethods.id] }),
}));

// receipts
export const receiptsRelations = relations(receipts, ({ one }) => ({
  order: one(orders, { fields: [receipts.orderId], references: [orders.id] }),
}));

// kitchen tickets
export const kitchenTicketsRelations = relations(kitchenTickets, ({ one, many }) => ({
  order: one(orders,      { fields: [kitchenTickets.orderId],  references: [orders.id] }),
  table: one(floorTables, { fields: [kitchenTickets.tableId],  references: [floorTables.id] }),
  items: many(kitchenTicketItems),
}));

// kitchen ticket items
export const kitchenTicketItemsRelations = relations(kitchenTicketItems, ({ one }) => ({
  ticket:    one(kitchenTickets, { fields: [kitchenTicketItems.ticketId],    references: [kitchenTickets.id] }),
  orderItem: one(orderItems,     { fields: [kitchenTicketItems.orderItemId], references: [orderItems.id] }),
}));

// customer display
export const customerDisplaySessionsRelations = relations(customerDisplaySessions, ({ one }) => ({
  activeOrder: one(orders, { fields: [customerDisplaySessions.activeOrderId], references: [orders.id] }),
}));
