// notification.worker.ts — render and dispatch immediate alerts to watchlist recipients.

import { Worker } from "bullmq";
import { connection, QUEUES, type NotifyJob } from "../lib/queue";
import { dispatchForChange, type MatchableChange, type WatchlistLike } from "../lib/services/notification.service";
import { mockEmailProvider } from "../lib/integrations/email/mock";

// PRODUCTION: load the change + active watchlists + recipient/role maps from the DB.
// Here we resolve them via a loader that the mock feed / seed would provide.
async function loadChange(_changeRef: string): Promise<MatchableChange | null> {
  // db.changeEvent.findUnique(...) → map to MatchableChange
  return null;
}
async function loadActiveWatchlists(_orgId: string): Promise<WatchlistLike[]> {
  // db.watchlist.findMany({ where: { active: true }, include: { rules, recipients } })
  return [];
}

export const notificationWorker = new Worker<NotifyJob>(
  QUEUES.notify,
  async (job) => {
    const change = await loadChange(job.data.changeRef);
    if (!change) return { skipped: true, reason: "change not found" };

    const watchlists = await loadActiveWatchlists(job.data.organisationId);
    const sent = await dispatchForChange(change, {
      email: mockEmailProvider,           // PRODUCTION: bind real EmailProvider
      watchlists,
      // roleEmailMap + siteNameMap loaded from the user database / sites table
    });

    // PRODUCTION: write Alert rows + AuditLog (category NOTIFICATION) for each dispatch.
    return { dispatched: sent.length };
  },
  { connection, concurrency: 8 },
);

notificationWorker.on("completed", (job, res) =>
  console.log(`[notify] ${job.data.changeRef} → ${JSON.stringify(res)}`));
notificationWorker.on("failed", (job, err) =>
  console.error(`[notify] failed ${job?.data.changeRef}: ${err.message}`));
