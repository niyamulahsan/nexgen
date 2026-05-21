import { createRoute, createRouter, HttpStatusCodes, jsonContent, z } from "@/framework/facade.js";
import { index } from "@/modules/welcome/controllers/welcome.controller.js";
import { WelcomeSchema } from "@/modules/welcome/controllers/welcome.schema.js";

const indexRoute = createRoute({
  path: "/",
  method: "get",
  tags: ["Welcome"],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        data: z.array(WelcomeSchema)
      }),
      "Welcome list"
    )
  }
});

export default createRouter().api(indexRoute, index);
