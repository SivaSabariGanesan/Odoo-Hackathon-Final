import { createRouter } from "../../lib/openapi.ts";
import { adminRoutes } from "./routes/admin.routes.ts";
import { customerRoutes } from "./routes/customer.routes.ts";

const selfOrderRouter = createRouter();

selfOrderRouter.route("/", adminRoutes);
selfOrderRouter.route("/", customerRoutes);

export { selfOrderRouter };
