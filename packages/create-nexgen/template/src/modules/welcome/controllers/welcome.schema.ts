import { z } from "@hono/zod-openapi";

export const WelcomeSchema = z.object({
  id: z.number(),
  title: z.string()
});
