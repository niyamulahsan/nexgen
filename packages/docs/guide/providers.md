# Providers

## Overview

A **provider** is an implementation the framework asks for instead of shipping one. The built-in auth provider is one. A payment gateway, an SMS driver or a custom user store can be others.

The rule is simple:

> The framework never imports your application code. Your application registers an implementation, the framework consumes it through a contract.

There is **no container, no decorators and no auto-wiring**. A provider is a plain object registered under a key.

A provider is a **capability**, not a domain. If the thing you are building has routes, tables, jobs or tests, it is a module that *uses* a provider — see [One file, a folder, or a module?](#one-file-a-folder-or-a-module).

## Where providers live

| Location              | Scope                                    | Imported                        |
| --------------------- | ---------------------------------------- | ------------------------------- |
| `src/providers/**`    | The whole application                    | Every matching file, at boot    |
| `src/modules/<m>/providers.ts` | One module, plugged into the app | Automatically, at boot          |
| `src/modules/<m>/providers/*.ts` | One module, several implementations | Every file directly in `providers/`, at boot |

All three are discovered by the framework at startup. Drop a file in and it runs — there is nothing to edit in `app.ts`, and nothing to import from `@/framework/...` internals.

The scaffold ships an empty `src/providers/` folder with a short `README.md` next to it, and every new module gets a `providers.ts` next to its `facade.ts`.

### Generating one

```bash
npm run maker provider:make payment          # -> src/providers/payment.ts
npm run maker module:make-provider billing stripe  # -> src/modules/billing/providers/stripe.ts
```

`provider:make` writes an app-wide provider, `module:make-provider` writes one inside a module. Both files register themselves when they are imported. See [Provider Commands](../cli/provider).

`provider:make` always writes a **single flat file**. A nested provider folder is supported by the loader, but you create it by hand — see below.

### One file, a folder, or a module?

The loader globs `src/providers/**/*.{ts,js,mjs}` and imports **every** matching file at boot, in sorted order. Module providers are narrower: only `providers.ts` and `providers/*.ts` are imported. That difference decides the layout.

| Situation | Layout |
| --- | --- |
| One driver, small, no shared contract | `src/providers/sms.ts` |
| A real contract, two or more drivers, tests | `src/modules/sms/` with `providers.ts` as the registrar |
| A capability only one module owns | `src/modules/<module>/providers.ts` |
| Anything with rows, routes, expiry or cleanup | A module — never a provider |

The test is not line count, it is **"will there be a second implementation?"** One vendor stays a single file. Two or more become module-shaped, because that is the only layout where the drivers you did not select cost nothing at boot.

#### Example: SMS is a provider, OTP is a module

They feel like one feature, but they sit at different layers:

| | SMS | OTP |
| --- | --- | --- |
| What it is | A transport — how a message leaves the building | A feature — generate, hash, expire, verify, rate-limit |
| Where it belongs | `src/providers/sms.ts` or `src/modules/sms/` | `src/modules/otp/` |
| Why | Swappable per vendor, stateless, no routes | Has tables, routes, a cleanup job and tests |

OTP *uses* the SMS provider. It does not become one:

```ts
// src/modules/otp/services/otp.ts
import { getProvider } from "@/framework/facade.js";
import type { SmsProvider } from "@/providers/sms.js";

const sms = getProvider<SmsProvider>("sms");
if (!sms) throw new Error("SMS provider is not registered");

await sms.send({ to, body: `Your code is ${code}` });
```

Putting OTP under `src/providers/` would move a module into the wrong folder: it would lose route auto-discovery, migrations, seeders and the module test convention.

#### Layout A — single file

```ts
// src/providers/sms.ts
import { registerProvider } from "@/framework/facade.js";

export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<{ id: string }>;
}

const provider: SmsProvider = {
  async send({ to, body }) {
    const driver = process.env.SMS_DRIVER ?? "log";

    if (driver === "twilio") {
      const { default: twilio } = await import("twilio"); // lazy: no boot cost
      // ... send with twilio
    }

    console.log(`[sms] ${to}: ${body}`);
    return { id: "local" };
  }
};

registerProvider("sms", provider);
```

#### Layout B — folder inside `src/providers/`

```
src/providers/sms/
  index.ts          ← the only file that calls registerProvider("sms", ...)
  contracts.ts      ← SmsProvider, SmsMessage
  drivers/twilio.ts
  drivers/log.ts
  __tests__/sms.test.ts
```

This works with no framework change, but remember that **every file in the folder is imported at boot**:

- `drivers/twilio.ts` is imported even when `SMS_DRIVER=log`. Keep SDK imports and client construction inside `send()`, never at module scope.
- If a driver imports a package that is not installed, the file is logged and skipped on every boot.
- Only `index.ts` may register the key. Two registrars for one key is a silent last-wins race decided by sorted order.
- Helper files are fine only if importing them has no side effects.

#### Layout C — module-shaped

```
src/modules/sms/
  facade.ts          ← smsSend(), typed, for other modules
  contracts.ts       ← SmsProvider, SmsMessage
  providers.ts       ← registerProvider("sms", ...)   ← imported at boot
  drivers/
    twilio.ts        ← NOT imported at boot
    vonage.ts        ← NOT imported at boot
    log.ts
  __tests__/
    sms.test.ts
```

Module discovery imports `providers.ts` and `providers/*.ts` — not `drivers/`. So an unselected driver stays cold and may keep a top-level SDK import. This is the layout to choose once a provider has a real contract and more than one implementation.

Module-scoped providers are covered in [Module providers](#module-providers).

### Rules the loader enforces

1. **The key is the capability, not the vendor.** Register `"sms"`, not `"twilio"`. The vendor is configuration (`SMS_DRIVER`), so consumers never change.
2. **One registrar per key.** Registration overwrites. With several files registering the same key, the last one imported wins, silently.
3. **Provider files must be import-safe.** No network calls, no client construction, no `throw` at module scope. The loader catches a failing file, logs a warning and continues — so a broken provider simply does not exist.
4. **`getProvider()` returns `null`.** Consumers decide whether to throw, fall back, or degrade. `notify()` degrades; a payment provider should probably throw.
5. **Never import an implementation.** Read it through `getProvider<T>(key)` so swapping vendors stays a one-line change.
6. **Tests are ignored in `src/providers/`** (`__tests__/*`, `*.test.*`, `*.spec.*`, `*.d.ts`). Keeping a test next to a provider is safe.

## Registering an implementation

Every provider is registered under a key:

```ts
// src/providers/payment.ts
import { registerProvider } from "@/framework/facade.js";

registerProvider("payment", {
  async charge(order) {
    return { id: "ch_123", status: "paid" };
  }
});
```

And read back the same way:

```ts
import { getProvider } from "@/framework/facade.js";

const payment = getProvider<any>("payment");

if (!payment) {
  throw new Error('Payment provider is not registered');
}
```

`getProvider()` returns `null` for an unknown key, so the check is part of the contract rather than an edge case.

`registerProvider()` returns the implementation, so it can be inlined:

```ts
export const payment = registerProvider("payment", {
  async charge(order) {
    return { id: "ch_123", status: "paid" };
  }
});
```

## The built-in auth contract

`auth` is the key nexwire ships with. Its contract is `AuthProvider`:

```ts
// src/providers/auth.ts
import { registerAuthProvider } from "@/framework/facade.js";
import type { AuthProvider } from "@/framework/facade.js";

const authProvider: AuthProvider = {
  async getUserById(id) {
    return { id, email: "user@example.com", tenantId: 42, plan: "pro" };
  },
  async findRefreshToken(jti) {
    return { id: 1, jti, revoked: false, expiresAt: new Date() };
  },
  async revokeRefreshToken(tokenId) {},
  async getAuthContext(user, payload) {
    return { id: user.id, email: user.email, tenantId: user.tenantId };
  },
  async getUserContact(userId) {
    return { email: "user@example.com", name: "User" };
  }
};

registerAuthProvider(authProvider);
```

| Method | Required | Purpose |
| --- | --- | --- |
| `getUserById(id)` | Yes | Loads a user. `id` is `number | string`, and extra fields are passed through to the auth context. |
| `findRefreshToken(jti)` | Yes | Loads a stored refresh token by its JWT id. |
| `revokeRefreshToken(id)` | No | Revokes a refresh token. `deleteRefreshToken(id)` also works. |
| `getAuthContext(user, payload)` | No | Shapes the object handlers receive as `auth`. |
| `getUserContact(userId)` | No | Finds the email/name of a user — used by `notify()`. Accepts `number | string`. |

Every auth id in the contract is `number | string` so a provider backed by UUIDs is a first-class citizen.

When no auth provider is registered, the framework falls back to the built-in one from `src/modules/auth`. Delete that module and register your own to take over completely — see [Authentication](./auth).

## The notification contract

`notification` is the storage contract `notify()` and `/api/notification/*` read through. Notifications are opt-in: run `module:make-notification notification` to generate an implementation at `src/modules/notification/providers/notification.ts`, or register your own under this key to replace storage — a different table, a remote service, a test double.

```ts
// src/providers/notification.ts
import { registerNotificationProvider } from "@/framework/facade.js";
import type { NotificationProvider } from "@/framework/facade.js";

const notificationProvider: NotificationProvider = {
  async create(target, input) {
    // persist and return a NotificationRecord
  },
  async list(target, options) {},
  async unreadCount(target) {},
  async markRead(target, id) {},
  async markAllRead(target) {},
  async remove(target, id) {},
  async deleteForTarget(target) {} // optional bulk cleanup
};

registerNotificationProvider(notificationProvider);
```

| Method | Required | Purpose |
| --- | --- | --- |
| `create(target, input)` | Yes | Stores one notification and returns it. |
| `list(target, options)` | Yes | Returns `{ data, total, unread, page, perPage }`. |
| `unreadCount(target)` | Yes | Returns the unread count. |
| `markRead(target, id)` | Yes | Marks one notification read; returns whether it existed. |
| `markAllRead(target)` | Yes | Marks every unread notification read; returns how many changed. |
| `remove(target, id)` | Yes | Deletes one notification; returns whether it existed. |
| `deleteForTarget(target)` | No | Removes everything owned by a target (useful when the owner is deleted). |

A target is `{ type?: string; id: number | string }`; `type` defaults to `"user"` and the id is always passed through as-is, so numeric auth ids and UUIDs both work.

Mail and realtime stay in the runtime: a custom provider only replaces storage, and `notify({ broadcast, mail })` keeps working. Without the generated module and without a registered provider, `notify()` warns once and returns `null`, and the HTTP handlers return `503`.

## Module providers

A module can plug itself into the application the same way:

```ts
// src/modules/billing/providers.ts
import { registerProvider } from "@/framework/facade.js";

registerProvider("billing", {
  async invoice(order) {
    return { id: "inv_1" };
  }
});
```

When a module offers more than one implementation, they live in its `providers/` folder — those files are imported at boot as well:

```ts
// src/modules/billing/providers/stripe.ts
import { registerProvider } from "@/framework/facade.js";

registerProvider("stripe", {
  async charge(order) {
    return { id: "ch_123" };
  }
});
```

The module ships the implementation, the application decides to use it. Nothing in `src/modules/billing/` has to know whether the app consumed it.

## Module-to-module communication

Modules do not import each other. There are three ways to talk:

| Need                                      | Mechanism                              |
| ----------------------------------------- | -------------------------------------- |
| Call something another module owns        | That module's `facade.ts`             |
| Notify another module something happened  | `dispatchEvent` / `dispatchCommand`    |
| Swap an implementation                    | A provider                             |

A module's `facade.ts` is its public API — other modules import from it, never from its controllers or services:

```ts
// src/modules/billing/facade.ts
export { createInvoice } from "./services/invoice.service.js";
```

```ts
// src/modules/orders/controllers/order.controller.ts
import { createInvoice } from "@/modules/billing/facade.js";
```

When one module only needs to react to another, use an event rather than an import — the two modules then stay independent:

```ts
// src/modules/orders/controllers/order.controller.ts
import { dispatchEvent } from "@/framework/facade.js";

await dispatchEvent("order.created", { orderId });
```

```ts
// src/modules/billing/providers.ts
import { registerProvider } from "@/framework/facade.js";
import { dispatchEvent } from "@/framework/facade.js";

registerProvider("billing", {
  async onOrderCreated(payload) {
    // react to the event
  }
});
```

## API

| Function | Purpose |
| --- | --- |
| `registerProvider(key, impl)` | Registers an implementation under a key and returns it. |
| `getProvider(key)` | Returns the implementation, or `null`. |
| `hasProvider(key)` | Reports whether an implementation is registered. |
| `clearProvider(key)` | Removes it — mainly useful in tests. |
| `listProviders()` | Lists every registered key. |
| `registerAuthProvider(impl)` | Typed shorthand for the `auth` key. |
| `getAuthProvider()` | The registered auth provider, or `null`. |
| `hasAuthProvider()` | Reports whether an auth provider is registered. |
| `clearAuthProvider()` | Removes it — mainly useful in tests. |
| `registerNotificationProvider(impl)` | Typed shorthand for the `notification` key. |
| `getNotificationProvider()` | The registered notification provider, or `null`. |
| `hasNotificationProvider()` | Reports whether a notification provider is registered. |
| `clearNotificationProvider()` | Removes it — mainly useful in tests. |
| `resolveAuthProvider()` | The registered auth provider, or the built-in one, or `null`. |
| `resolveNotificationProvider()` | The registered notification provider, or `null`. |
| `loadProviders()` | Imports the provider files. Called by the framework at boot. |

All of them are imported from the facade:

```ts
import {
  registerProvider,
  getProvider,
  hasProvider,
  clearProvider,
  listProviders,
  registerAuthProvider,
  getAuthProvider,
  hasAuthProvider,
  clearAuthProvider,
  registerNotificationProvider,
  getNotificationProvider,
  hasNotificationProvider,
  clearNotificationProvider
} from "@/framework/facade.js";
```

## Notes

- Provider files are imported **once per process, before routes are mounted**, so a provider is already available to middleware, route guards and seeders.
- The framework never imports `@/framework/...` internals into your code, and your code never needs to import framework internals either: the facade is the public API.

## Related

- [Authentication](./auth) — the built-in auth provider and its contract.
- [Modules](./modules) — how modules are structured.
- [Provider Commands](../cli/provider) — `provider:make` and `module:make-provider`.
- [Events & Queue](./events-queue) — `dispatchEvent` / `dispatchCommand`.
