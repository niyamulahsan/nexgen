/**
 * Why: Central public API surface for framework consumers.
 * When: Modules/middlewares need framework utilities.
 * Where: App-layer imports should target this file.
 * How: Re-exports stable, reusable helpers while hiding setup internals.
 */

// ==========================================
// 1. External & Core Utilities
// ==========================================
export { createRoute, z } from "@hono/zod-openapi";
export * as lodash from "lodash-es";
export * as HttpStatusCodes from "stoker/http-status-codes";
export { jsonContent } from "stoker/openapi/helpers";
// ==========================================
// 6. Cache & Session
// ==========================================
export { cache } from "@/framework/cache/cache.js";
// ==========================================
// 2. Database
// ==========================================
export { database, db } from "@/framework/database/connection.js";
export { type PaginatedResult, paginate, paginateModel, paginateQuery, paginateTable } from "@/framework/database/paginate.js";
// ==========================================
// 4. Events & Queue
// ==========================================
export { command, dispatchCommand, dispatchEvent } from "@/framework/events/dispatcher.js";
// ==========================================
// 3. HTTP & Routing
// ==========================================
export { createRouter, group } from "@/framework/http/router.js";
export { validate } from "@/framework/http/validation.js";
export { broadcastChannel } from "@/framework/notification/channels/broadcast.js";
export { mailChannel } from "@/framework/notification/channels/mail.js";
export type { NotificationChannel, NotificationOptions } from "@/framework/notification/contracts.js";
// ==========================================
// 10. Notification Engine (Delivery Channels)
// ==========================================
export { notify } from "@/framework/notification/index.js";
export { registerChannel } from "@/framework/notification/registry.js";
// ==========================================
// 9. Providers (Storage/Auth)
// ==========================================
export { resolveAuthProvider, resolveNotificationProvider } from "@/framework/providers/adapter.js";
export type {
  AuthProvider,
  AuthProviderRefreshToken,
  AuthProviderUser,
  AuthUserContact,
  AuthUserContext,
  NotifiableTarget,
  NotificationCreateInput,
  NotificationListOptions,
  NotificationPage,
  NotificationProvider,
  NotificationRecord
} from "@/framework/providers/contracts.js";
export { loadProviders } from "@/framework/providers/loader.js";
export {
  clearAuthProvider,
  clearNotificationProvider,
  clearProvider,
  getAuthProvider,
  getNotificationProvider,
  getProvider,
  hasAuthProvider,
  hasNotificationProvider,
  hasProvider,
  listProviders,
  registerAuthProvider,
  registerNotificationProvider,
  registerProvider
} from "@/framework/providers/registry.js";
export { queue, queueJob, shouldQueue } from "@/framework/queue/queue.js";
// ==========================================
// 5. Realtime
// ==========================================
export { broadcast } from "@/framework/realtime/index.js";
export { defineSchedule } from "@/framework/scheduler/scheduler.js";
export { session } from "@/framework/session/session.js";
// ==========================================
// 7. Storage & Mail
// ==========================================
export { storage } from "@/framework/storage/storage.js";
// ==========================================
// 8. Security & Auth
// ==========================================
export { cookie } from "@/framework/support/cookie.js";
export { jwt } from "@/framework/support/jwt.js";
// ==========================================
// 11. Utilities
// ==========================================
export { logger } from "@/framework/support/logger.js";
export { mail } from "@/framework/support/mail.js";
export { password } from "@/framework/support/password.js";
export { urls } from "@/framework/support/url.js";
