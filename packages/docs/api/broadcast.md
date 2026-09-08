# `broadcast` — Socket.IO broadcast

Imported from the facade: `import { broadcast } from "@/framework/facade.js"`.

Emits Socket.IO events to targeted audiences. Authenticated sockets are auto-joined to `"auth"`, `"user:<id>"`, and `"role:<role>"` rooms on handshake. See [Realtime](./../guide/realtime).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `broadcast` | `(event, payload, options?) => void` | Emit `event` with `payload` to the audiences in `options` |

`BroadcastOptions` (all combinable):

| Option | Type | Targets |
| --- | --- | --- |
| `all` | `boolean` | every connected client |
| `auth` | `boolean` | all authenticated clients (room `"auth"`) |
| `users` | `(number\|string)[]` | user rooms (`"user:42"`) |
| `roles` | `string[]` | role rooms (`"role:admin"`) |
| `rooms` | `string[]` | arbitrary custom rooms |

## Use cases

### Targeted broadcasts

```ts
import { broadcast } from "@/framework/facade.js";

broadcast("post.published", { postId: 1 }, { all: true });        // all connected clients
broadcast("notification.new", payload, { auth: true });           // all authenticated users
broadcast("user.message", payload, { users: [recipientId] });     // specific users
broadcast("admin.alert", payload, { roles: ["admin"] });          // specific roles
broadcast("chat.message", payload, { rooms: ["room:chat:general"] }); // custom rooms
broadcast("order.updated", payload, { users: [userId], roles: ["admin"] }); // combined
```

### From a queue handler

```ts
import { broadcast } from "@/framework/facade.js";

await broadcast("post.published", { postId, status: "live" }, { all: true });
await broadcast("user.notification", { message: "Your post is live!" }, { users: [authorId] });
```

### Direct vs `dispatchEvent`

| | `broadcast()` | `dispatchEvent()` |
| --- | --- | --- |
| Broadcasts | yes | yes (via `broadcast` option) |
| Queues a job | no | yes (via `queue` option) |
| Best for | fire-and-forget socket emit | broadcast + side effects in one call |

### Real world — keeping clients in sync

Server emits with the channel name embedded in the event name (`<channel>.<action>`); the Vue UI listens on `pulse.channel(...)` and registers `.listen(event)` — no custom channel strings to keep in sync:

```ts
// modules/activity/controllers/activity.controller.ts — after a mutation
await dispatchEvent("activity.changed", { id, name }, { broadcast: { auth: true } });
```

```vue
<!-- resources/src/pages/entity/index.vue — reactive list refresh -->
<script setup lang="ts">
import { pulse } from "@/plugins/pulse";
import { onMounted, onUnmounted } from "vue";

onMounted(() => {
  let ch = pulse.channel("entity");
  ch.listen("entity.changed", async () => { await fetchList(); });
});
onUnmounted(() => { pulse.leave("entity"); });
</script>
```

Private per-user channels use the `user:<id>` naming and are emitted with `broadcast: { users: [id] }` — e.g. export-notification pages listen on `pulse.channel("user:${authUser.value.id}")` and request reports announce `report.*.ready` back to that single user:

```ts
// modules/report/jobs/collectionExaminerExport.ts
await dispatchEvent("report.collectionexaminerexport.ready", { downloadUrl, authId },
  { broadcast: { users: [authId] } });
```

```vue
pulse.channel(`user:${authUser.value.id}`).listen("report.collectionexaminerexport.ready", (event) => {
  status.value = "ready";
  downloadUrl.value = event.data.downloadUrl;
});
```

## Notes

- Works within a single process out of the box; with `REDIS=true`, `@socket.io/redis-adapter` fans out across every server instance.
- When the socket server is disabled (`SOCKET=false`) or unavailable in this process, `broadcast` either relays through Redis pub/sub (main process) or returns immediately — it never throws.
- Client-side listeners use the **Pulse** plugin (`pulse.channel("user:42").listen("post.published", cb)`) — see [Realtime](./../guide/realtime).

## Related

- [dispatchEvent](./dispatchEvent) · [shouldQueue](./shouldQueue)