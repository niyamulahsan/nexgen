import type { Handler } from "hono";
import { cache } from "@/framework/facade.js";

// Why: Provides a stable starter endpoint for health/demo responses.
// When: Used when clients need a quick read-only payload without auth.
// Where: Mounted at the welcome module root route.
export const index: Handler = async (c) => {
  const data = await cache.remember("welcome:index", 60, async () => [
    { id: 1, title: "nexgen framework ready" },
    { id: 2, title: "modules are auto-discovered" }
  ]);

  return c.json({ message: "Success", data });
};
