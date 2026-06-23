// queue.ts — BullMQ queue definitions over Redis.
//
// One connection, several named queues. Job payload types are exported so producers
// (API route handlers, schedulers) and consumers (workers) share the same contract.
//
// PRODUCTION: REDIS_URL points at a managed Redis. Workers run as a separate process
// (`pnpm workers`) so heavy ingest/diff/AI work never blocks the web tier.

import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

export const connection: ConnectionOptions = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis({ host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null });

export const QUEUES = {
  ingest: "ci:ingest",
  notify: "ci:notify",
  escalation: "ci:escalation",
  digest: "ci:digest",
} as const;

// ---- job payloads ----
export interface IngestJob {
  regulationRef: string;
  prevVersionLabel: string;
  currVersionLabel: string;
  organisationId: string;
}
export interface NotifyJob {
  changeRef: string;        // change to render + dispatch
  organisationId: string;
}
export interface EscalationJob { organisationId: string }
export interface DigestJob {
  period: "DAILY" | "WEEKLY" | "MONTHLY";
  audience: "REGIONAL" | "EXECUTIVE";
  organisationId: string;
}

export const ingestQueue = new Queue<IngestJob>(QUEUES.ingest, { connection });
export const notifyQueue = new Queue<NotifyJob>(QUEUES.notify, { connection });
export const escalationQueue = new Queue<EscalationJob>(QUEUES.escalation, { connection });
export const digestQueue = new Queue<DigestJob>(QUEUES.digest, { connection });

export const defaultJobOpts = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};
