import cron from "node-cron";
import { discoverModuleFiles, importFile } from "@/framework/modules/discover.js";
import { runWithLock } from "@/framework/scheduler/lock.js";

type Schedule = {
  name: string;
  expression: string;
  handler: () => void | Promise<void>;
  timezone?: string;
  runOnInit?: boolean;
  enabled?: boolean;
  ttlMs?: number;
};

const schedules: Schedule[] = [];
const tasks: Array<{ stop: () => void; destroy?: () => void }> = [];

/**
 * Why: Registers a cron schedule definition at runtime.
 * When: Module console/schedule files are imported.
 * Where: Scheduler-related module files.
 * How: Pushes normalized schedule config into in-memory registry.
 */
export function defineSchedule(schedule: Schedule) {
  schedules.push({ enabled: true, runOnInit: false, ttlMs: 120_000, ...schedule });
}

/**
 * Why: Loads module schedule files so jobs are registered.
 * When: Scheduler boot process starts.
 * Where: Scheduler worker startup.
 * How: Discovers schedules/console files and imports them.
 */
export async function bootSchedules() {
  const files = await discoverModuleFiles("**/{schedules,console}/*.{ts,js}");
  for (const file of files) await importFile(file);
  return files.length;
}

/**
 * Why: Starts cron tasks for all enabled schedules.
 * When: Scheduler worker process boots.
 * Where: `schedule:work` runtime.
 * How: Wraps each handler with distributed lock and schedules via node-cron.
 */
export async function startScheduler() {
  await bootSchedules();

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;

    const run = () =>
      runWithLock(
        schedule.name,
        async () => {
          await schedule.handler();
        },
        { ttlMs: schedule.ttlMs }
      );

    const task = cron.schedule(schedule.expression, run, { timezone: schedule.timezone });
    tasks.push(task);
    if (schedule.runOnInit) await run();
  }

  return schedules.length;
}

/**
 * Why: Stops and destroys active cron tasks.
 * When: Scheduler shutdown.
 * Where: Process lifecycle handlers.
 * How: Iterates task registry and invokes stop/destroy.
 */
export function stopScheduler() {
  for (const task of tasks) {
    task.stop();
    task.destroy?.();
  }

  tasks.length = 0;
}
