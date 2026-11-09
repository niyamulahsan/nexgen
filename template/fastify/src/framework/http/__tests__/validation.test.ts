import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { registerErrorHandler } from "@/framework/http/logger.js";
import { ValidationErrorSchema } from "@/framework/http/validation.js";

/**
 * Tier 1: the Zod error contract.
 *
 * Fastify's default validation error is a 400. The framework promises 422 with
 * `{ success: false, error: { name, issues } }` so clients see the same shape
 * across Hono, Express, and Fastify.
 *
 * The route declares a 422 response schema on purpose: Fastify serializes error
 * responses through the route's response schema, so a `{ message }` 422 would
 * turn every validation failure into a 500 serialization error.
 */
async function buildApp() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);

  app.post(
    "/register",
    {
      schema: {
        body: z
          .object({ email: z.email(), password: z.string().min(6) })
          .superRefine((value, ctx) => {
            if (value.password === "123456") {
              ctx.addIssue({ code: "custom", path: ["password"], message: "Too weak" });
            }
          }),
        response: { 200: z.object({ ok: z.boolean() }), 422: ValidationErrorSchema }
      }
    },
    async () => ({ ok: true })
  );

  await app.ready();
  return app;
}

describe("Zod validation errors", () => {
  it("returns 422 with the shared error contract for schema failures", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/register",
      payload: { email: "not-an-email", password: "short" }
    });

    expect(response.statusCode).toBe(422);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error.name).toBe("ZodError");
    expect(Array.isArray(body.error.issues)).toBe(true);
    expect(body.error.issues.length).toBeGreaterThan(0);
    await app.close();
  });

  it("returns 422 for superRefine failures", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/register",
      payload: { email: "user@example.com", password: "123456" }
    });

    expect(response.statusCode).toBe(422);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error.name).toBe("ZodError");
    expect(body.error.issues.some((issue: { message: string }) => issue.message === "Too weak")).toBe(true);
    await app.close();
  });
});
