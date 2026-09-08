# `dispatchEvent` — fire a domain event

Imported from the facade: `import { dispatchEvent } from "@/framework/facade.js"`.

Fans a domain event out to Socket.IO broadcast and/or BullMQ queues in one call. Broadcasts first (when `broadcast` is given), then enqueues (when `queue` is given). See [Events & Queue](./../guide/events-queue).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `dispatchEvent` | `(name, payload, options?) => Promise<void>` | Broadcast via Socket.IO and/or enqueue a background job |

Options:

| Option | Type | Description |
| --- | --- | --- |
| `broadcast` | `object` | Socket.IO audience — `all` \| `auth` \| `roles[]` \| `users[]` \| `rooms[]` (combinable) |
| `queue` | `string \| boolean` | `true` → `"default"` queue; string → named queue |

Broadcast targets:

```ts
broadcast: { all: true }                 // every connected client
broadcast: { auth: true }                // all authenticated clients (room "auth")
broadcast: { roles: ["admin"] }          // role rooms
broadcast: { users: [1, 42] }            // user rooms ("user:1", "user:42")
broadcast: { rooms: ["room:chat:general"] } // custom rooms
broadcast: { roles: ["admin"], users: [userId] } // combine freely
```

## Use cases

### Broadcast only

```ts
await dispatchEvent("post.published", { postId: 1, title: "Hello" }, {
  broadcast: { all: true },
});
```

### Queue only

```ts
await dispatchEvent("user:signup", { userId, email }, {
  queue: "mail",   // "true" uses the "default" queue
});
```

### Broadcast + queue together

```ts
await dispatchEvent("post.publish", body, {
  queue: "default",
  broadcast: { roles: ["admin"], users: [authorId] },
});
```

### Real world — events across the app

The event name doubles as the job name when queueing (`dispatchEvent` → `shouldQueue` with the same string):

```ts
// modules/auth/controllers/auth.controller.ts — forgot-password flow
await dispatchEvent("user:forget-password", { email: user.email, forgetPassword: user.forgetPassword }, { queue: "mail" });

// modules/auth/jobs/forgetpass.ts — the matching handler
shouldQueue("user:forget-password", "mail", async (job) => {
  await mail.sendMail({ to: job.data.email, subject: "Forget password", html: `Your password is ${job.data.forgetPassword}` });
  return { ok: true };
});
```

Broadcast targets map to real audiences — refresh the authenticated crew after a file change, or ping exactly the user who triggered an export:

```ts
// modules/report/controllers/files.controller.ts
await dispatchEvent("report.file.changed", { name: file.name }, { broadcast: { auth: true } });

// modules/report/jobs/collectionExaminerExport.ts — tell the requester their export is ready
await dispatchEvent("report.collectionexaminerexport.ready", { downloadUrl, authId }, { broadcast: { users: [authId] } });
```

## Notes

- The event `name` is used verbatim as the queue job name (`shouldQueue(name, ...)`) and as the socket event name, so server and client (`pulse.channel(x).listen(name)`) stay in sync.
- Both channels degrade gracefully — with `SOCKET=false` broadcast is a no-op; with no Redis, queueing returns `null` and never throws.

## Related

- [shouldQueue](./shouldQueue) · [broadcast](./broadcast) · [dispatchCommand](./dispatchCommand)