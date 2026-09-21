import { env } from "@/env.js";

export const securityConfig = {
  enabled: env.SECURITY_HEADERS,
  csp: "default-src 'self'",
  hsts: env.APP_ENV === "production",
  hstsMaxAge: "max-age=31536000; includeSubDomains",
  xFrame: "DENY"
};

export type SecurityConfig = typeof securityConfig;
