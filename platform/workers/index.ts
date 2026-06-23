// workers/index.ts — worker process bootstrap. Run with `pnpm workers` (tsx).
//
// Imports each worker (which registers its BullMQ processor on import) and registers the
// repeatable schedules. Kept as a separate process from the Next.js web tier so ingestion,
// diffing, AI and notification work never block request handling.

import { ingestWorker } from "./ingest.worker";
import { notificationWorker } from "./notification.worker";
import { escalationWorker } from "./escalation.worker";
import { digestWorker, registerSchedules } from "./digest.scheduler";

async function main() {
  await registerSchedules();
  console.log("[workers] online: ingest, notification, escalation, digest");
}

const shutdown = async () => {
  console.log("[workers] shutting down…");
  await Promise.allSettled([
    ingestWorker.close(),
    notificationWorker.close(),
    escalationWorker.close(),
    digestWorker.close(),
  ]);
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

main().catch((e) => { console.error(e); process.exit(1); });
