import { createRouter } from "../../lib/openapi.ts";
import { customerDisplayRoutes } from "./routes/display.routes.ts";

const displayRouter = createRouter();

displayRouter.route("/", customerDisplayRoutes);

export { displayRouter };
