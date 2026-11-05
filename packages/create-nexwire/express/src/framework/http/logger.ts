import type { ErrorRequestHandler, RequestHandler } from "express";
import createError from "http-errors";
import { logger } from "@/framework/support/logger.js";
import { openApiConfig } from "@/config/index.js";

function requestIp(req: Parameters<RequestHandler>[0]) {
  const forwarded = req.headers["x-forwarded-for"];
  return String(req.headers["cf-connecting-ip"] || forwarded || req.headers["x-real-ip"] || req.socket.remoteAddress || "");
}

// এই ফাংশনটি Express-এর জন্য তৈরি করা হয়েছে, তাই এটি কিছু অতিরিক্ত পাথও বাদ দেয় যা Hono-তে প্রযোজ্য নয়।
function shouldSkipHttpLog(pathname: string) {
  // /queues, /queues/..., /favicon.ico বাদ দিন
  return pathname.startsWith("/queues") || pathname === "/favicon.ico" || pathname === openApiConfig.scalar.specUrl || pathname === openApiConfig.scalar.docsPath;
}

export const loggerMiddleware: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  res.locals.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  res.on("finish", () => {
    // req.originalUrl ব্যবহার করুন, কারণ req.url রাউটারের ভেতরে বদলে যায়
    const pathname = (req.originalUrl || req.url || "").split("?")[0];

    // shouldSkipHttpLog চেক করুন
    if (!shouldSkipHttpLog(pathname)) {
      logger.info("HTTP Request", {
        requestId,
        method: req.method,
        path: pathname,
        url: req.originalUrl,
        status: res.statusCode,
        duration_ms: Date.now() - startedAt,
        ip: requestIp(req),
        userAgent: req.headers["user-agent"] || null
      });
    }
  });

  next();
};

export const notFound: RequestHandler = (req, _res, next) => {
  next(createError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const onError: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = typeof error?.status === "number" ? error.status : 500;

  if (error?.success === false && error?.error?.issues) {
    logger.warn("Request validation failed", {
      status,
      issues: error.error.issues
    });

    res.status(status).json({
      success: false,
      error: {
        name: error.error.name ?? "ZodError",
        issues: error.error.issues
      }
    });

    return;
  }

  const message = status === 500 && !error?.expose ? "Internal server error" : (error?.message ?? "Internal server error");
  const stack = process.env.NODE_ENV === "production" ? undefined : error?.stack;

  logger.error("Request failed", {
    status,
    message,
    stack: error?.stack
  });

  res.status(status).json({ message, ...(stack ? { stack } : {}) });
};
