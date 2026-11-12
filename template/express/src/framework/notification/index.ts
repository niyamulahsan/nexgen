// ./src/framework/notification/index.ts

import type { NormalizedTarget, NotificationOptions, NotificationTarget } from "@/framework/notification/contracts.js";
import { getChannels } from "@/framework/notification/registry.js";
import { resolveNotificationProvider } from "@/framework/providers/adapter.js";
import type { NotificationRecord } from "@/framework/providers/contracts.js";

let missingProviderWarned = false;

/** Turn the public target argument into the polymorphic owner pair. */
function normalizeTarget(target: NotificationTarget): NormalizedTarget {
  if (target !== null && typeof target === "object") {
    return {
      type: String(target.type || "user").trim() || "user",
      id: target.id
    };
  }
  return { type: "user", id: target as number | string };
}

/**
 * Why: Persists a notification to the database and triggers all active channels.
 * When: A feature wants to record something for a user.
 * Where: Application code, through the framework facade.
 * How: The provider owns database storage. The channels handle delivery (mail, sms, ws).
 */
export async function notify(target: NotificationTarget, options: NotificationOptions): Promise<NotificationRecord | null> {
  const provider = await resolveNotificationProvider();
  if (!provider) {
    if (!missingProviderWarned) {
      missingProviderWarned = true;
      console.warn(
        '[notification] skipped: no notification provider is registered. Run "bun maker module:make-notification notification" then "bun maker module:migrate notification", or register a provider in src/providers/.'
      );
    }
    return null;
  }

  const normalizedTarget = normalizeTarget(target);

  // 1. Save to Database via the Provider
  const normalized = await provider.create(normalizedTarget, {
    type: options.type,
    title: options.title,
    body: options.body ?? null,
    link: options.link ?? null,
    data: options.data ?? null
  });

  // 2. Dispatch to all registered channels in parallel
  const channels = getChannels();
  await Promise.allSettled(
    channels.map((channel) =>
      channel.send(normalizedTarget, normalized, options).catch((err) => {
        console.error(`[notification] Channel ${channel.name} failed:`, err);
      })
    )
  );

  return normalized;
}
