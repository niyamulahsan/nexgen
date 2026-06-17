import { type Job, type JobsOptions, Queue, QueueEvents, Worker } from "bullmq";
import { env } from "@/env.js";
import { discoverModuleFiles, importFile } from "@/framework/modules/discover.js";
import { redisClientIfReady } from "@/framework/redis/client.js";

export type QueueHandler = (job: Job) => Promise<any>;

const queues = new Map<string, Queue>();
const events = new Map<string, QueueEvents>();
const handlers = new Map<string, QueueHandler>();
const workers: Worker[] = [];

function queuePrefix() {
  return `${env.REDIS_PREFIX}:queue`;
}

function key(queue: string, job: string) {
  return `${queue}:${job}`;
}

/**
 * Why: Registers a job handler for a queue + job name.
 * When: Module job files are loaded during boot.
 * Where: Module job definition files under `src/modules/<module>/jobs`.
 * How: Stores handler in an in-memory lookup key.
 */
export function shouldQueue(job: string, queue: string, handler: QueueHandler) {
  handlers.set(key(queue || "default", job), handler);
}

/**
 * Why: Gets or lazily creates a BullMQ queue instance.
 * When: Enqueueing jobs or ensuring queue resources.
 * Where: Queue facade and dispatcher.
 * How: Reuses shared Redis connection and memoized queue map.
 */
export function getQueue(queue = "default") {
  const client = redisClientIfReady();
  if (!client) return null;

  if (!queues.has(queue)) {
    queues.set(
      queue,
      new Queue(queue, {
        connection: client as any,
        prefix: queuePrefix(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 3000 },
          removeOnComplete: 1000,
          removeOnFail: 5000
        }
      })
    );
  }

  return queues.get(queue)!;
}

/**
 * Why: Facade-friendly alias for getQueue.
 * When: Consumers want fluent queue access.
 * Where: Framework facade/API usage.
 * How: Delegates directly to getQueue.
 */
export function queue(queueName = "default") {
  return getQueue(queueName);
}

/**
 * Why: Ensures configured queues exist before UI/runtime usage.
 * When: BullBoard setup or startup warmup.
 * Where: Queue UI/bootstrap code.
 * How: Iterates names and resolves queue instances.
 */
export function ensureQueues(queueNames: string[]) {
  for (const queueName of queueNames) {
    getQueue(queueName);
  }
}

/**
 * Why: Returns all created queue instances.
 * When: Queue introspection and dashboard binding.
 * Where: BullBoard setup code.
 * How: Converts internal queue map to array.
 */
export function getAllQueues() {
  return Array.from(queues.values());
}

/**
 * Why: Adds a job to BullMQ with project defaults.
 * When: Commands/events need background execution.
 * Where: Dispatcher and feature modules.
 * How: Resolves queue then calls add with retry/backoff options.
 */
export async function queueJob(
  job: string,
  data: any,
  options: {
    queue?: string;
    delay?: number;
    attempts?: number;
    jobId?: string;
    priority?: number;
    removeOnComplete?: JobsOptions["removeOnComplete"];
    removeOnFail?: JobsOptions["removeOnFail"];
    backoff?: JobsOptions["backoff"];
  } = {}
) {
  const queueName = options.queue || "default";
  const queue = getQueue(queueName);
  if (!queue) return null;

  return await queue.add(job, data, {
    delay: options.delay ? options.delay * 1000 : 0,
    attempts: options.attempts ?? 3,
    jobId: options.jobId,
    priority: options.priority,
    removeOnComplete: options.removeOnComplete ?? 1000,
    removeOnFail: options.removeOnFail ?? 5000,
    backoff: options.backoff ?? { type: "exponential", delay: 3000 }
  });
}

/**
 * Why: Loads module job files so handlers are registered.
 * When: Worker start and explicit queue boot flows.
 * Where: Worker/runtime bootstrap.
 * How: Discovers jobs glob and imports each file.
 */
export async function bootQueueJobs() {
  const files = await discoverModuleFiles("**/jobs/*.{ts,js}");
  for (const file of files) await importFile(file);
  return files.length;
}

/**
 * Why: Starts BullMQ workers for selected queues.
 * When: Queue worker process boots.
 * Where: Worker runtime entrypoint.
 * How: Boots handlers, creates QueueEvents, and creates workers.
 */
export async function startQueueWorker(queueNames = ["default"]) {
  await bootQueueJobs();
  const client = redisClientIfReady();
  if (!client) throw new Error("Redis is required for queue workers");

  for (const queueName of queueNames) {
    if (!events.has(queueName)) {
      events.set(
        queueName,
        new QueueEvents(queueName, { connection: client as any, prefix: queuePrefix() })
      );
    }

    const worker = new Worker(
      queueName,
      async (job) => {
        console.log(`[${new Date().toLocaleTimeString()}] Processing: ${job.name} (${queueName})`);
        const handler = handlers.get(key(queueName, job.name));
        if (!handler) throw new Error(`No handler registered for ${queueName}:${job.name}`);
        return await handler(job);
      },
      { connection: client as any, prefix: queuePrefix(), concurrency: 10 }
    );

    worker.on("completed", (job) => {
      console.log(`[${new Date().toLocaleTimeString()}] Processed:  ${job.name} (${queueName})`);
    });

    worker.on("failed", (job, error) => {
      const jobName = job?.name ?? "unknown";
      console.log(
        `[${new Date().toLocaleTimeString()}] Failed:     ${jobName} (${queueName}) - ${error.message}`
      );
    });

    workers.push(worker);
  }
}

/**
 * Why: Clears queue-related Redis keys for reset workflows.
 * When: Local cleanup and maintenance commands.
 * Where: `queue:clear` command.
 * How: Scans prefixed keys and deletes in batches.
 */
export async function clearQueue() {
  const client = redisClientIfReady();
  if (!client) return;

  const stream = client.scanStream({ match: `${queuePrefix()}*`, count: 100 });
  for await (const keys of stream) {
    if (keys.length) await client.del(keys);
  }
}

/**
 * Why: Gracefully stops all workers/events/queues.
 * When: Process shutdown.
 * Where: Server/worker lifecycle hooks.
 * How: Closes resources with Promise.allSettled and clears registries.
 */
export async function stopQueueRuntime() {
  await Promise.allSettled(workers.map((worker) => worker.close()));
  workers.length = 0;

  await Promise.allSettled(Array.from(events.values()).map((queueEvents) => queueEvents.close()));
  events.clear();

  await Promise.allSettled(Array.from(queues.values()).map((queue) => queue.close()));
  queues.clear();
}
