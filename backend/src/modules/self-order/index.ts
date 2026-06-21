import { createRouter } from "../../lib/openapi.ts";
import { adminRoutes } from "./routes/admin.routes.ts";
import { customerRoutes } from "./routes/customer.routes.ts";
import { chatRoutes } from "./routes/chat.route.ts";
import { upsellRoutes } from "./routes/upsell.route.ts";

const selfOrderRouter = createRouter();

selfOrderRouter.route("/", adminRoutes);
selfOrderRouter.route("/", customerRoutes);
selfOrderRouter.route("/", chatRoutes);
selfOrderRouter.route("/", upsellRoutes);

export { selfOrderRouter };
