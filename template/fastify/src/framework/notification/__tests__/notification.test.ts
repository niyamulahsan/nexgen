// ./src/framework/notification/__tests__/notification.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotificationChannel } from "@/framework/notification/contracts.js";
import { notify } from "@/framework/notification/index.js";
import { clearChannels, getChannels, registerChannel } from "@/framework/notification/registry.js";
import type {
  NotifiableTarget,
  NotificationCreateInput,
  NotificationProvider,
  NotificationRecord
} from "@/framework/providers/contracts.js";
import { clearNotificationProvider, registerNotificationProvider } from "@/framework/providers/registry.js";

/**
 * `notify()` is the only notification API an application calls. These tests pin
 * the guarantees it makes regardless of the storage provider or the delivery
 * channels a project registers:
 *
 *  - a numeric id, a string id (UUID, ULID, ...) and an explicit target all
 *    become a stable `{ type, id }` pair, so replacing auth does not force a
 *    notification change
 *  - the provider stores the record once, then every registered channel gets the
 *    normalized target, the stored record, and the original options
 *  - one failing channel cannot lose the notification or stop the other channels
 *  - a missing provider is reported once and skipped, never thrown
 */

// `resolveNotificationProvider()` calls `loadProviders()` on every lookup. In a
// unit test there is no project provider to discover, and importing the real
// provider graph would pull in Redis, S3 and BullMQ just to find nothing. File
// discovery has its own coverage in providers/__tests__/providers.test.ts, so
// stub the loader here and keep these tests about notify() and the channels.
vi.mock("@/framework/providers/loader.js", () => ({
  loadProviders: async () => 0
}));

type ProviderCall = { target: NotifiableTarget; input: NotificationCreateInput };

/** A provider that records what the runtime asked it to store. */
function recordingProvider() {
  const calls: ProviderCall[] = [];
  const provider: NotificationProvider = {
    create: async (target, input): Promise<NotificationRecord> => {
      calls.push({ target, input });
      return {
        id: `n-${calls.length}`,
        notifiableType: String(target.type || "user"),
        notifiableId: String(target.id),
        type: input.type || "info",
        title: input.title,
        body: input.body ?? null,
        data: input.data ?? null,
        link: input.link ?? null,
        readAt: null,
        createdAt: new Date(0).toISOString()
      };
    },
    list: async () => ({ data: [], total: 0, unread: 0, page: 1, perPage: 20 }),
    unreadCount: async () => 0,
    markRead: async () => false,
    markAllRead: async () => 0,
    remove: async () => false
  };
  return { provider, calls };
}

type ChannelCall = {
  channel: string;
  target: unknown;
  record: NotificationRecord;
  options: unknown;
};

/** A channel that records what it was handed, and can be told to fail. */
function recordingChannel(name: string, seen: ChannelCall[], fail = false): NotificationChannel {
  return {
    name,
    async send(target, record, options) {
      seen.push({ channel: name, target, record, options });
      if (fail) throw new Error(`${name} failed`);
      return true;
    }
  };
}

afterEach(() => {
  clearNotificationProvider();
  clearChannels();
  vi.restoreAllMocks();
});

describe("notify", () => {
  it("maps a numeric id to the default user target", async () => {
    const { provider, calls } = recordingProvider();
    registerNotificationProvider(provider);

    const record = await notify(42, { title: "Hello" });

    expect(calls).toEqual([{ target: { type: "user", id: 42 }, input: expect.objectContaining({ title: "Hello" }) }]);
    expect(record?.notifiableId).toBe("42");
  });

  it("passes a string id through unchanged, so UUID owner ids work", async () => {
    const { provider, calls } = recordingProvider();
    registerNotificationProvider(provider);
    const id = "9b2f6f2e-4a9c-4a0e-9f1d-3f6a1c2b3d4e";

    await notify(id, { title: "Hello" });

    expect(calls[0].target).toEqual({ type: "user", id });
  });

  it("keeps an explicit notifiable type instead of forcing user", async () => {
    const { provider, calls } = recordingProvider();
    registerNotificationProvider(provider);

    await notify({ type: "team", id: 7 }, { title: "Hello" });

    expect(calls[0].target).toEqual({ type: "team", id: 7 });
  });

  it("forwards the notification fields to the provider", async () => {
    const { provider, calls } = recordingProvider();
    registerNotificationProvider(provider);

    await notify(1, {
      type: "invoice",
      title: "Invoice paid",
      body: "Thanks",
      link: "/invoices/1",
      data: { invoiceId: 1 }
    });

    expect(calls[0].input).toEqual({
      type: "invoice",
      title: "Invoice paid",
      body: "Thanks",
      link: "/invoices/1",
      data: { invoiceId: 1 }
    });
  });

  it("sends the stored record to every registered channel with the original options", async () => {
    const { provider } = recordingProvider();
    registerNotificationProvider(provider);
    const seen: ChannelCall[] = [];
    registerChannel(recordingChannel("mail", seen));
    registerChannel(recordingChannel("broadcast", seen));

    const options = { title: "Hello", body: "World", mail: { to: "a@b.c" }, broadcast: true };
    const record = await notify(7, options);

    expect(record?.title).toBe("Hello");
    expect(seen).toHaveLength(2);
    expect(seen.map((entry) => entry.channel).sort()).toEqual(["broadcast", "mail"]);
    for (const entry of seen) {
      expect(entry.target).toEqual({ type: "user", id: 7 });
      expect(entry.record).toBe(record);
      expect(entry.options).toBe(options);
    }
  });

  it("keeps the notification when a channel throws and still runs the others", async () => {
    const { provider } = recordingProvider();
    registerNotificationProvider(provider);
    const seen: ChannelCall[] = [];
    registerChannel(recordingChannel("broken", seen, true));
    registerChannel(recordingChannel("ok", seen));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const record = await notify(1, { title: "Hello" });

    expect(record).not.toBe(null);
    expect(seen.map((entry) => entry.channel).sort()).toEqual(["broken", "ok"]);
    expect(error).toHaveBeenCalled();
  });

  it("still returns the stored record when no channel is registered", async () => {
    const { provider, calls } = recordingProvider();
    registerNotificationProvider(provider);

    const record = await notify(3, { title: "Hello" });

    expect(calls).toHaveLength(1);
    expect(record?.id).toBe("n-1");
  });

  it("warns once and returns null when no provider is registered", async () => {
    vi.resetModules();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const { notify: isolatedNotify } = await import("@/framework/notification/index.js");

      expect(await isolatedNotify(1, { title: "first" })).toBe(null);
      expect(await isolatedNotify(2, { title: "second" })).toBe(null);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain("no notification provider");
    } finally {
      warn.mockRestore();
      vi.resetModules();
    }
  });
});

describe("channel registry", () => {
  it("lists channels sorted by registration order", () => {
    registerChannel(recordingChannel("mail", []));
    registerChannel(recordingChannel("broadcast", []));

    expect(getChannels().map((channel) => channel.name)).toEqual(["mail", "broadcast"]);
  });

  it("replaces a channel with the same name (last wins)", () => {
    const first = recordingChannel("mail", []);
    const second = recordingChannel("mail", []);

    registerChannel(first);
    registerChannel(second);

    expect(getChannels()).toEqual([second]);
  });

  it("clears every registered channel", () => {
    registerChannel(recordingChannel("mail", []));
    registerChannel(recordingChannel("broadcast", []));

    clearChannels();

    expect(getChannels()).toEqual([]);
  });
});
