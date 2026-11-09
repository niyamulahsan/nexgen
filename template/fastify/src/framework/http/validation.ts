import { z } from "zod";

/**
 * Why: Documents the error contract Fastify actually returns for bad input.
 * When: Any route declares a 422 response.
 * Where: Route schemas, alongside the body/params schema that can fail.
 * How: Fastify serializes error responses through the route's response schema,
 *      so a 422 must be described as the Zod error shape — not `{ message }`.
 */
export const ValidationErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    name: z.string(),
    issues: z.array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
        code: z.string()
      })
    )
  })
});

/**
 * Why: Validates data outside of Fastify's route schema pipeline.
 * When: Controllers or services need to parse a payload by hand (e.g. a value
 *       built at runtime rather than read straight from the request).
 * Where: Anywhere the framework exposes a manual parse boundary.
 * How: Throws an Error with `statusCode = 422`; the global error handler turns
 *      it into the same `{ success:false, error:{ name, issues } }` contract the
 *      route-level validator produces.
 */
export async function validate<T extends z.ZodType>(schema: T, data: unknown): Promise<z.infer<T>> {
  const result = await schema.safeParseAsync(data);

  if (!result.success) {
    const error = new Error("Validation failed") as Error & {
      statusCode: number;
      success: boolean;
      error: { name: string; issues: z.core.$ZodIssue[] };
    };
    error.statusCode = 422;
    error.success = false;
    error.error = { name: result.error.name, issues: result.error.issues };
    throw error;
  }

  return result.data;
}
