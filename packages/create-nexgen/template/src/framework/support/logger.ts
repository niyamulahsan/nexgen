import fs from "node:fs";
import path from "node:path";
import winston from "winston";
import { env } from "@/env.js";

const logDir = path.resolve(process.cwd(), "src", "storage", "logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function visibleMeta(meta: Record<string, unknown>) {
  const { service: _service, ...rest } = meta;
  return rest;
}

function normalizeMeta(meta: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...meta };

  const processMeta = next.process as Record<string, unknown> | undefined;
  if (processMeta && typeof processMeta === "object") {
    const memoryUsage = processMeta.memoryUsage as Record<string, unknown> | undefined;
    if (memoryUsage && typeof memoryUsage === "object") {
      processMeta.memoryUsage = Object.entries(memoryUsage)
        .map(([key, value]) => `${key}=${value}`)
        .join(" ");
    }
    if (Array.isArray(processMeta.argv)) {
      processMeta.argv = `[${processMeta.argv.join(" ")}]`;
    }
    next.process = processMeta;
  }

  const trace = next.trace;
  if (Array.isArray(trace) && trace.length > 3) {
    next.trace = [...trace.slice(0, 3), `... ${trace.length - 3} more frame(s)`];
  }

  const osMeta = next.os as Record<string, unknown> | undefined;
  if (osMeta && typeof osMeta === "object" && Array.isArray(osMeta.loadavg)) {
    osMeta.loadavg = `[${osMeta.loadavg.join(",")}]`;
    next.os = osMeta;
  }

  return next;
}

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const rest = normalizeMeta(visibleMeta(meta));
    const metaString = Object.keys(rest).length ? `\n${JSON.stringify(rest, null, 2)}` : "";
    return `[${timestamp}] ${level} -> ${stack || message}${metaString}\n`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const rest = normalizeMeta(visibleMeta(meta));
    const metaString = Object.keys(rest).length ? `\n${JSON.stringify(rest, null, 2)}` : "";
    return `[${timestamp}] ${level} -> ${stack || message}${metaString}`;
  })
);

/**
 * Why: Shared structured logger for app/runtime/framework internals.
 * When: Any code needs operational logs or error reporting.
 * Where: Imported across framework and modules.
 * How: Writes color console logs + rotating files with exception/rejection handlers.
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL || "info",
  defaultMeta: {
    service: env.APP_NAME
  },
  transports: [
    new winston.transports.Console({
      level: env.LOG_LEVEL || "debug",
      format: consoleFormat
    }),
    new winston.transports.File({
      filename: path.join(logDir, "app.log"),
      level: "info",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      format: fileFormat
    }),
    new winston.transports.File({
      filename: path.join(logDir, "fatal.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 3,
      tailable: true,
      handleExceptions: true,
      handleRejections: true,
      format: fileFormat
    })
  ]
});
