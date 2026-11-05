# `notify` — notifications

Imported from the facade: `import { notify } from "@/framework/facade.js"`.

Creates a user-visible notification through the registered notification provider, stores it, then dispatches the stored record to every registered delivery channel (built-in: realtime broadcast and email). Notifications are opt-in: generate the backend with `module:make-notification notification` and create its table with `module:migrate notification`. Until then `notify()` warns once and returns `null`. See [Notifications](./../guide/notification).

## Functions

| Function | Signature                                                  | Description                                                        |
| -------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `notify` | `(target, options) => Promise<NotificationRecord \| null>` | Stores a notification, then dispatches it to every registered channel. `null` when no provider is available. |

`target` is `number | string | { type?: string; id: number | string }`. A bare number/string becomes `{ type: "user", id }`.

`NotificationOptions`:

| Option      | Type      | Default  | Description                                              |
| ----------- | --------- | -------- | -------------------------------------------------------- |
| `type`      | `string`  | `"info"` | Free-form category — `info`, `success`, `warning`, `error`, or any key you choose (`"invoice.paid"`) |
| `title`     | `string`  | —        | **Required.** Notification title                         |
| `body`      | `string`  | —        | Body text                                                |
| `link`      | `string`  | —        | Click-through URL                                        |
| `data`      | `object`  | —        | Arbitrary JSON stored in the `data` column               |
| `broadcast` | `boolean` | `false`  | Emit `"notification.created"` to the user's socket room  |
| `mail`      | `object`  | —        | `{ subject?, html?, to? }` — sends email through the `mail` queue when Redis is available, directly otherwise |
| `sms`       | `object`  | —        | `{ to?, message? }` — consumed by a custom `sms` channel; ignored by the built-ins |
| `push`      | `object`  | —        | `{ token?, payload? }` — consumed by a custom `push` channel; ignored by the built-ins |

### Recipient resolution

When `mail` is set, the recipient is resolved in this order: `mail.to` → the auth provider's `getUserContact(id)` → skipped. There is no users-model fallback. See [Providers](./../guide/providers). `subject` defaults to the notification title, and `html` is generated from the title and body when omitted.

## Delivery channels

After the provider stores the record, `notify()` sends it to every channel in the registry in parallel (`Promise.allSettled`):

| Function            | Signature                                  | Description                                        |
| ------------------- | ------------------------------------------ | -------------------------------------------------- |
| `registerChannel`   | `(channel: NotificationChannel) => void`   | Register or replace a channel by name              |
| `mailChannel`       | `NotificationChannel`                      | Built-in; sends only when `mail` is set            |
| `broadcastChannel`  | `NotificationChannel`                      | Built-in; emits only when `broadcast` is set       |

```ts
interface NotificationChannel {
  name: string;
  send(target, notification, options): Promise<boolean>;
}
```

The built-ins are registered at boot by `src/providers/notification.ts`. Register your own for `sms`, `push`, webhooks, chat, etc. A channel returns `false` when it has nothing to do and `true` when it delivered. Failures are logged and never throw out of `notify()`. `registerChannel` is exported from the facade; the lower-level `getChannels()` and `clearChannels()` helpers live in `@/framework/notification/registry.js` and are mainly for tests. See [Notifications → Delivery channels](./../guide/notification#delivery-channels).

## Use cases

### Save to database only

```ts
import { notify } from "@/framework/facade.js";

await notify(userId, {
  type: "info",
  title: "Profile Updated",
  body: "Your profile was saved.",
});
```

### Save + realtime broadcast

```ts
await notify(userId, {
  type: "success",
  title: "Payment Received",
  body: "$50.00 credited.",
  broadcast: true, // UI bell badge updates instantly via Pulse
});
```

### Save + broadcast + email

```ts
await notify(userId, {
  type: "warning",
  title: "Password Expiring",
  body: "Change within 7 days.",
  broadcast: true,
  mail: {
    subject: "Password Expiry Notice",
    html: "<p>Your password expires soon.</p>",
  },
});
```

### Inside a controller

::: code-group

```ts [Hono]
export const createComment: Handler = async (c: any) => {
  const { postId, content } = c.req.valid("json");
  await notify(post.authorId, {
    type: "info",
    title: "New Comment",
    body: `${c.get("auth").name} commented on your post.`,
    link: `/posts/${postId}`,
    broadcast: true,
  });
  return c.json({ message: "Comment created" });
};
```

```ts [Express]
export const createComment = async (req: Request, res: Response) => {
  const { postId, content } = req.body;
  await notify(post.authorId, {
    type: "info",
    title: "New Comment",
    body: `${res.locals.auth.name} commented on your post.`,
    link: `/posts/${postId}`,
    broadcast: true,
  });
  res.json({ message: "Comment created" });
};
```

:::

### Client-side pickup

```ts
import { pulse } from "@/plugins/pulse";

const channel = pulse.channel(`user:${userId}`);
channel.listen("notification.created", (payload) => {
  items.value.unshift(payload);
  unread.value++;
});
```

## Lifecycle

```
notify(target, { broadcast: true, mail: { ... } })
  ├─ 1. resolveNotificationProvider() — registered provider, else null
  │      └─ null → log one warning, return null (no throw)
  ├─ 2. provider.create(target, input) → normalized record
  └─ 3. getChannels() → send to all channels in parallel (Promise.allSettled)
         ├─ broadcast channel (only when `broadcast` is set)
         │      dispatchEvent("notification.created", normalized, { broadcast: { users: [id] } })
         │      └─ Socket.IO emits to room "user:<id>"
         ├─ mail channel (only when `mail` is set)
         │      ├─ recipient = mail.to, else authProvider.getUserContact(id)
         │      │      └─ neither → no email is sent
         │      ├─ Redis available → dispatchEvent("notification:mail", ..., { queue: "mail" })
         │      │      └─ BullMQ worker sends the email
         │      └─ Redis off → mail.sendMail({ to, subject, html }) directly
         └─ custom channels (sms, push, webhook, ...) receive the same options
```

## `dispatchEvent` vs `notify`

|                     | `dispatchEvent`                                     | `notify`                                                                  |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| **Persistence**     | No — fire-and-forget signal                         | Yes — stores through the notification provider, returns the normalized record |
| **Broadcast scope** | Flexible (`all`, `auth`, `roles`, `users`, `rooms`) | Always to a single user (`users: [userId]`)                               |
| **Email delivery**  | No                                                  | Yes — via `mail: { subject, html, to? }`                                  |
| **Queue option**    | Yes                                                 | Yes — internally calls `dispatchEvent` with `{ queue: "mail" }` when Redis is available |

## Notes

- The notification table is standalone: `src/modules/notification/database/models/notification.ts`, with no foreign key to auth. One row is one notification for one `(notifiable_type, notifiable_id)` owner.
- Delivery runs through registered channels: the built-ins handle `broadcast` and `mail`, and any channel you register with `registerChannel()` receives the same options object.
- `broadcast: true` emits the `"notification.created"` event — listen on the `user:<id>` room to update bell badges without polling.
- Return value is the normalized record: `{ id, notifiableType, notifiableId, type, title, body, data, link, readAt, createdAt }`. `id` is a string (UUID by default), so it works whether the auth id is numeric or a UUID.
- Numeric and string ids are both accepted and always stored as text.
