import "dotenv/config";
import { db } from "../db/index.ts";
import { orders } from "../db/schema/index.ts";

const [order] = await db.insert(orders).values({
  orderNumber: "TEST-PAY-001",
  status:      "READY",
  grandTotal:  "250.00",
  subtotal:    "250.00",
  source:      "POS",
  type:        "TAKEAWAY",
}).returning({ publicId: orders.publicId, orderNumber: orders.orderNumber, status: orders.status, grandTotal: orders.grandTotal });

console.log("Test order created:");
console.log(JSON.stringify(order, null, 2));
process.exit(0);
