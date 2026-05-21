# Notifications

## Overview

The notification system is a full-stack feature. A single CLI command generates backend controllers, frontend components, routes, and wiring — all with real-time support via Socket.IO.

## CLI Commands

### Create

```bash
bun maker module:make-notification notification
```

This generates everything needed:

**Backend** (under `src/modules/notification/`):

| File | Purpose |
|---|---|
| `controllers/notification.controller.ts` | 5 handlers: list, unreadCount, markRead, markAllRead, remove |
| `controllers/notification.schema.ts` | Zod/OpenAPI schemas |
| `routes/api.ts` | 5 routes under `authMiddleware` |
| `jobs/notification.ts` | Queue handler for email delivery |

**Frontend** (under `src/resources/src/`):

| File | Purpose |
|---|---|
| `components/NotificationBell.vue` | Bell icon with unread badge + dropdown |
| `pages/notifications/index.vue` | Full notifications management page |

**Mutations to existing files:**

| File | Change |
|---|---|
| `src/resources/src/router/index.ts` | Adds `/notifications` route under `dashlayout` |
| `src/resources/src/layouts/Layout/Header.vue` | Inserts `NotificationBell` before user dropdown |

### Delete

```bash
bun maker module:delete-notification notification --yes
```

Removes everything — moves backend module, bell component, and page to trash, then cleans up the route and header imports.

### API Routes

All routes are mounted at `/api/notification` behind `authMiddleware`:

| Method | Path | Handler |
|---|---|---|
| `GET` | `/` | Paginated list with unread count |
| `GET` | `/unread-count` | `{ count }` |
| `PATCH` | `/{id}/read` | Mark single as read |
| `PATCH` | `/read-all` | Mark all as read |
| `DELETE` | `/{id}` | Delete a notification |

## Database Model

Notifications use a single shared table defined in `src/modules/auth/database/models/notifications.ts`:

| Column | Type | Notes |
|---|---|---|
| `id` | `INT` PK auto-increment | |
| `user_id` | `INT` FK → users.id | Cascade on delete |
| `type` | `VARCHAR(100)` | `info`, `success`, `warning`, `error` |
| `title` | `VARCHAR(255)` | Required |
| `body` | `TEXT` | Nullable |
| `data` | `TEXT` | JSON string — extra payload |
| `link` | `VARCHAR(500)` | Click-through URL |
| `read_at` | `TIMESTAMP` | Nullable, set when read |
| `created_at` | `TIMESTAMP` | Default now |

## The `notify()` Function

Import from the facade:

```ts
import { notify } from "@/framework/facade.js";

// Save to database only
await notify(userId, {
  type: "info",
  title: "Profile Updated",
  body: "Your profile was saved."
});

// Save + broadcast via Socket.IO in real-time
await notify(userId, {
  type: "success",
  title: "Payment Received",
  body: "$50.00 credited.",
  broadcast: true
});

// Save + broadcast + send email (queued to "mail" queue)
await notify(userId, {
  type: "warning",
  title: "Password Expiring",
  body: "Change within 7 days.",
  broadcast: true,
  mail: {
    subject: "Password Expiry Notice",
    html: "<p>Your password expires soon.</p>"
  }
});
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | `string` | `"info"` | Category: `info`, `success`, `warning`, `error` |
| `title` | `string` | — | **Required.** Notification title |
| `body` | `string` | — | Notification body text |
| `link` | `string` | — | Click-through URL |
| `data` | `object` | — | Arbitrary JSON stored in `data` column |
| `broadcast` | `boolean` | `false` | Emit `"notification.created"` via Socket.IO to user |
| `mail` | `object` | — | `{ subject?, html? }` — sends email via mail queue |

### Lifecycle

```
notify(userId, { broadcast: true, mail: { ... } })
  │
  ├─ 1. Insert row into notifications table
  │
  ├─ 2. dispatchEvent("notification.created", normalized, {
  │       broadcast: { users: [userId] }
  │     })
  │     └─ Socket.IO emits to room "user:<userId>"
  │
  └─ 3. If mail option:
        └─ dispatchEvent("notification:mail", ..., { queue: "mail" })
            └─ BullMQ Worker sends email
```

## Frontend Integration

### How It Works

The generated `NotificationBell.vue` uses Pulse to listen for real-time notifications:

```ts
import { pulse } from "@/plugins/pulse";

onMounted(async () => {
  await fetchRecent();

  if (user.value) {
    const channel = pulse.channel(`user:${user.value.id}`);
    channel.listen("notification.created", (payload: any) => {
      items.value.unshift(payload);  // prepend to dropdown
      unread.value++;                 // increment badge
    });
    cleanup = () => channel.stopListening("notification.created");
  }
});
```

When `notify()` is called with `broadcast: true`, the `"notification.created"` event fires via Socket.IO. The Pulse channel listener picks it up and updates the bell badge and dropdown in real-time — no polling, no page refresh.

### NotificationBell Component

The bell icon in the header shows:
- **Badge** with unread count (caps at `99+`)
- **Dropdown** with 5 most recent notifications
- **Time-ago** formatting (`3m ago`, `2h ago`, `1d ago`)
- **Click** marks single as read
- **"Mark all read"** button
- **"View all notifications"** link to full page

### Full Notifications Page

Available at `/notifications`, the page provides:
- Paginated list of all notifications
- Per-row mark-read and delete actions
- Mark-all-read bulk action
- Real-time updates via Pulse

## Usage Example: Controller

```ts
import { notify } from "@/framework/facade.js";

export const createComment: Handler = async (c: any) => {
  const { postId, content } = c.req.valid("json");
  const post = await getPost(postId);

  // Notify the post author
  await notify(post.authorId, {
    type: "info",
    title: "New Comment",
    body: `${c.get("auth").name} commented on your post.`,
    link: `/posts/${postId}`,
    broadcast: true
  });

  return c.json({ message: "Comment created" });
};
```

The post author sees the notification appear in their bell dropdown instantly without refreshing.

## `dispatchEvent` vs. `notify`

Both functions can broadcast data to users in real-time, but they serve different purposes.

| | `dispatchEvent` | `notify` |
|---|---|---|
| **Persistence** | No — fire-and-forget signal | Yes — inserts a row into the `notifications` table |
| **Return value** | `Promise<void>` | Returns the normalized notification object with `id`, `type`, `title`, `body`, `readAt`, etc. |
| **Broadcast scope** | Flexible — `{ all: true }`, `{ auth: true }`, `{ roles: [] }`, `{ users: [] }`, `{ rooms: [] }`, or any combination | Targeted — always to a single user via `broadcast: { users: [userId] }` |
| **Email delivery** | No — you would need to build the email dispatch yourself | Built-in — pass `mail: { subject, html }` to queue an email |
| **Queue option** | Yes — `{ queue: "mail" }` enqueues a background job | Uses `dispatchEvent` internally when email is needed |
| **Use case** | Custom real-time updates (chat messages, live feeds, admin alerts) | User-visible notifications with persistent history (bell icon, notification page) |

### When to use each

```ts
import { dispatchEvent, notify } from "@/framework/facade.js";

// Use notify() when the user should see it in their notification history
await notify(userId, {
  type: "info",
  title: "New Follower",
  body: "Alice started following you.",
  broadcast: true
});

// Use dispatchEvent() for ephemeral real-time signals
await dispatchEvent("chat.message", { from: "Alice", text: "Hi!" }, {
  broadcast: { users: [recipientId] }
});

// Use dispatchEvent() for admin alerts — no DB persistence needed
await dispatchEvent("server.alert", { cpu: 92 }, {
  broadcast: { roles: ["admin"] }
});
```

In short: **`notify` is `dispatchEvent` with persistence, normalization, and email built on top.** If you need a notification history, use `notify`. If you only need a real-time signal, use `dispatchEvent` directly.
