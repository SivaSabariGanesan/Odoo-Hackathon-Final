import { createRouter } from "../../lib/openapi.ts";
import { adminRoutes } from "./routes/admin.routes.ts";
import { customerRoutes } from "./routes/customer.routes.ts";
import { chatRoutes } from "./routes/chat.route.ts";

const selfOrderRouter = createRouter();

selfOrderRouter.route("/", adminRoutes);
selfOrderRouter.route("/", customerRoutes);
selfOrderRouter.route("/", chatRoutes);

export { selfOrderRouter };
