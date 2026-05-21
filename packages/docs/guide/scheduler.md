# Scheduler

## Overview

Define cron tasks that run on a schedule. The scheduler uses **Redis lock** by default and **falls back to database lock** when Redis is unavailable — it auto-creates a `scheduler_locks` table via the DB adapter.

The scheduler can do anything a controller can: dispatch events, queue background jobs, broadcast to Socket.IO clients, and execute arbitrary logic.

## Define a Schedule

Create files under `src/modules/<module>/console/*.ts`:

```ts
import { defineSchedule } from "@/framework/facade.js";

defineSchedule({
  name: "cleanup-temp-files",
  expression: "0 */6 * * *",
  handler: async () => {
    // cleanup logic
  }
});
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | **Required.** Unique identifier used as the lock key |
| `expression` | `string` | — | **Required.** Cron expression (`* * * * *`) |
| `handler` | `function` | — | **Required.** Async function with the task logic |
| `timezone` | `string` | server TZ | Timezone for cron evaluation (e.g. `"America/New_York"`) |
| `runOnInit` | `boolean` | `false` | Run the handler immediately when the scheduler starts |
| `enabled` | `boolean` | `true` | Set to `false` to disable without deleting |
| `ttlMs` | `number` | `120000` | Lock TTL in milliseconds — prevents overlap if a run exceeds this |

## Start the Scheduler

```bash
bun maker schedule:work --prod --runtime=bun
```

The scheduler process:
1. Connects to database and Redis
2. Auto-discovers all `console/` files
3. Registers cron jobs via `node-cron`
4. Wraps each handler in a distributed lock

## Locking

The scheduler prevents duplicate execution when multiple instances run:

1. **Redis** — Uses `SET NX PX` atomic lock. Fast, auto-expires.
2. **Database fallback** — Creates a `scheduler_locks` table via the active dialect. Uses upsert with expiry column.

If a lock is held (another instance already running the task), the handler is skipped. The return value includes which backend was used:

```
{ ran: true, backend: "redis" }
{ ran: true, backend: "db" }
{ ran: false, backend: "redis" }   // skipped — lock held
```

## Broadcasting & Queueing from Schedules

A schedule handler can dispatch events, queue jobs, and broadcast — same API as controllers:

```ts
import { defineSchedule, dispatchEvent } from "@/framework/facade.js";

// Every night at 2am: generate reports, then notify admins
defineSchedule({
  name: "daily-report",
  expression: "0 2 * * *",
  handler: async () => {
    // 1. Queue the heavy work
    await dispatchEvent("report.generate", { date: "yesterday" }, {
      queue: "default"
    });

    // 2. Notify admins it's running
    await dispatchEvent("report.started", { date: "yesterday" }, {
      broadcast: { roles: ["admin"] }
    });
  }
});

// Every hour: check and send pending notifications
defineSchedule({
  name: "send-pending-notifications",
  expression: "0 * * * *",
  handler: async () => {
    const pending = await getPendingNotifications();

    for (const notif of pending) {
      await dispatchEvent("notification.send", notif, {
        queue: "mail",
        broadcast: { users: [notif.userId] }
      });
    }
  }
});

// Every 5 minutes: health check, broadcast to admins
defineSchedule({
  name: "health-check",
  expression: "*/5 * * * *",
  handler: async () => {
    const status = await checkServices();

    if (!status.ok) {
      await dispatchEvent("system.alert", status, {
        broadcast: { roles: ["admin"] }
      });
    }
  }
});
```

### Full Example: Report Generation Flow

```
Scheduler (every day at 2am)
  │
  ├─ dispatchEvent("report.generate", ..., { queue: "default" })
  │     └─ BullMQ Worker picks up
  │           └─ generates PDF, stores file
  │           └─ dispatchEvent("report.completed", ..., { broadcast: { roles: ["admin"] } })
  │
  └─ dispatchEvent("report.started", ..., { broadcast: { roles: ["admin"] } })
        └─ Socket.IO emits "report.started" to all "role:admin" rooms
```

```ts
import { defineSchedule, dispatchEvent } from "@/framework/facade.js";

defineSchedule({
  name: "daily-report",
  expression: "0 2 * * *",
  handler: async () => {
    await dispatchEvent("report.generate", { date: "yesterday" }, {
      queue: "default"
    });
    await dispatchEvent("report.started", { date: "yesterday" }, {
      broadcast: { roles: ["admin"] }
    });
  }
});
```

```ts
import { dispatchEvent, shouldQueue } from "@/framework/facade.js";

shouldQueue("report.generate", "default", async (job) => {
  const { date } = job.data;
  const pdfUrl = await generatePdfReport(date);

  await dispatchEvent("report.completed", { date, pdfUrl }, {
    broadcast: { roles: ["admin"] }
  });
});
```

## Graceful Shutdown

The scheduler registers shutdown signal handlers. On `SIGTERM` / `SIGINT` it stops all cron tasks, closes queue runtime, and disconnects Redis.
