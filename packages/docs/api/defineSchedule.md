# `defineSchedule` — cron schedules

Imported from the facade: `import { defineSchedule } from "@/framework/facade.js"`.

Registers named cron tasks run by the `schedule:work` process. Every run is wrapped in a distributed lock (Redis first, database fallback) so overlapping instances never double-execute. See [Scheduler](./../guide/scheduler).

## Signature

| Function | Signature | Description |
| --- | --- | --- |
| `defineSchedule` | `(schedule: Schedule) => void` | Register a schedule (handler mode or queue mode) |

`Schedule` options:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | — | **Required.** Unique identifier (used as the lock key) |
| `expression` | `string` | — | **Required.** Cron expression (`* * * * *`) |
| `handler` | `function` | — | Async task logic (handler mode) |
| `queue` | `string` | — | Queue mode: dispatch `job` to this queue on each tick |
| `job` | `string` | `name` | Job name enqueued on each tick (queue mode) |
| `data` | `any` | — | Static data passed to every enqueued job (queue mode) |
| `immediately` | `boolean` | `false` | Also dispatch one job immediately at scheduler boot (queue mode) |
| `timezone` | `string` | server TZ | Cron timezone (e.g. `"America/New_York"`) |
| `runOnInit` | `boolean` | `false` | Run handler immediately at boot (handler mode) |
| `enabled` | `boolean` | `true` | `false` disables the task without deleting it |
| `ttlMs` | `number` | `120000` | Lock TTL — prevents overlap if a run exceeds this |

## Use cases

### Basic handler schedule

```ts
import { defineSchedule } from "@/framework/facade.js";

defineSchedule({
  name: "cleanup-temp-files",
  expression: "0 */6 * * *",
  handler: async () => {
    await cleanTempFiles();
  },
});
```

### Dispatch + broadcast from a schedule

A schedule can do anything a controller can — queue jobs, dispatch events, broadcast:

```ts
import { defineSchedule, dispatchEvent } from "@/framework/facade.js";

defineSchedule({
  name: "daily-report",
  expression: "0 2 * * *",
  handler: async () => {
    await dispatchEvent("report.generate", { date: "yesterday" }, { queue: "default" });
    await dispatchEvent("report.started", { date: "yesterday" }, { broadcast: { roles: ["admin"] } });
  },
});
```

### Real world — nightly batch update

A cron handler that scans **keyset-paginated** rows (`id > lastId`, `LIMIT 1000`), updates them in chunks, then hands the collected results to a queue worker — the scan pattern to copy for any large bulk job:

```ts
// modules/collection/console/collection.ts
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { db, defineSchedule, dispatchEvent } from "@/framework/facade.js";
import { collectionbinds } from "@/modules/collectionbind/database/models/collectionbind.js";

defineSchedule({
  name: "collection:status-update",
  expression: "0 0 0 * * *",
  handler: async () => {
    const now = new Date();
    let lastId = 0;
    const expiredBinds: { commissionerateId: number; taxPeriod: string }[] = [];

    while (true) {
      const where: any[] = [eq(collectionbinds.last, 1), lt(collectionbinds.endDate, now)];
      if (lastId > 0) where.push(gt(collectionbinds.id, lastId));

      const rows = await db
        .select({ id: collectionbinds.id, commissionerateId: collectionbinds.commissionerateId, taxPeriod: collectionbinds.taxPeriod })
        .from(collectionbinds)
        .where(and(...where))
        .orderBy(collectionbinds.id)
        .limit(1000);

      if (!rows.length) break;
      await db.update(collectionbinds).set({ last: 0, updatedAt: now }).where(inArray(collectionbinds.id, rows.map((r) => r.id)));
      expiredBinds.push(...rows.map((r) => ({ commissionerateId: r.commissionerateId, taxPeriod: r.taxPeriod })));
      lastId = rows[rows.length - 1].id;
    }

    if (expiredBinds.length) {
      await dispatchEvent("collection.statusUpdate", { binds: expiredBinds }, { queue: "collection" });
    }
  },
});
```

### Queue mode

Tick-based dispatch without a local handler — the target queue's worker processes the job:

```ts
import { defineSchedule } from "@/framework/facade.js";

defineSchedule({
  name: "reminder",
  expression: "0 9 * * *",
  queue: "mail",
  job: "send.reminders",
  data: { template: "daily" },
  immediately: true,   // dispatch one job now at boot
});
```

### Disabled + timezone

```ts
defineSchedule({
  name: "health-check",
  expression: "*/5 * * * *",
  timezone: "America/New_York",
  enabled: false,      // keep the definition, skip execution
  handler: async () => checkServices(),
});
```

## Notes

- Files live in `src/modules/<module>/console/*.ts` and `schedules/*.ts` — `schedule:work` auto-discovers and imports them.
- Every run is locked: `{ ran: true, backend: "redis" | "db" }` on success, or `{ ran: false }` when another instance holds the lock.
- The scheduler prints a header and per-run timing (`name ........ 0.02s`, or `FAIL` on error). `startScheduler()` returns the number of registered schedules.
- Queue-mode schedules dispatch a job per tick and nothing else; worker processes are responsible for the actual work.

## Related

- [queueJob](./queueJob) · [dispatchEvent](./dispatchEvent)