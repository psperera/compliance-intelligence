// digest.scheduler.ts — schedules recurring digests + the hourly escalation sweep, and
// processes digest jobs by rendering and sending the summary email.

import { Worker } from "bullmq";
import {
  connection, QUEUES, digestQueue, escalationQueue, defaultJobOpts, type DigestJob,
} from "../lib/queue";
import { summariseDigest, renderDigestEmail, type DigestChange, type DigestAction } from "../lib/services/digest.service";
import { mockEmailProvider } from "../lib/integrations/email/mock";

const ORG = process.env.ORG_ID ?? "waygate";

/** Register repeatable jobs (idempotent — BullMQ dedupes by repeat key). */
export async function registerSchedules() {
  // weekly digest to regional HS&E leaders — Monday 07:00
  await digestQueue.add("weekly-regional", { period: "WEEKLY", audience: "REGIONAL", organisationId: ORG },
    { ...defaultJobOpts, repeat: { pattern: "0 7 * * 1" } });
  // monthly executive summary — 1st of month 08:00
  await digestQueue.add("monthly-exec", { period: "MONTHLY", audience: "EXECUTIVE", organisationId: ORG },
    { ...defaultJobOpts, repeat: { pattern: "0 8 1 * *" } });
  // daily APAC-style digest — 06:00
  await digestQueue.add("daily-regional", { period: "DAILY", audience: "REGIONAL", organisationId: ORG },
    { ...defaultJobOpts, repeat: { pattern: "0 6 * * *" } });
  // hourly escalation sweep
  await escalationQueue.add("sweep", { organisationId: ORG },
    { ...defaultJobOpts, repeat: { pattern: "0 * * * *" } });
  console.log("[scheduler] repeatable jobs registered");
}

// PRODUCTION: load from DB scoped to audience/region.
async function loadDigestData(_org: string): Promise<{ changes: DigestChange[]; actions: DigestAction[] }> {
  return { changes: [], actions: [] };
}
async function recipientsFor(audience: DigestJob["audience"], _org: string): Promise<string[]> {
  return audience === "EXECUTIVE" ? ["exec-lt@waygate.example"] : ["regional-hse@waygate.example"];
}

const WINDOW_DAYS: Record<DigestJob["period"], number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30 };

export const digestWorker = new Worker<DigestJob>(
  QUEUES.digest,
  async (job) => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_DAYS[job.data.period] * 24 * 3600 * 1000);
    const { changes, actions } = await loadDigestData(job.data.organisationId);
    const recipients = await recipientsFor(job.data.audience, job.data.organisationId);

    const input = {
      period: job.data.period, now, windowStart, changes, actions,
      audienceLabel: job.data.audience === "EXECUTIVE" ? "Corporate leadership" : "Regional HS&E leaders",
      recipients,
    };
    const summary = summariseDigest(input);
    const email = renderDigestEmail(input, summary);
    await mockEmailProvider.send(email); // PRODUCTION: real EmailProvider
    return { period: job.data.period, counts: summary.counts };
  },
  { connection },
);

digestWorker.on("completed", (job, res) =>
  console.log(`[digest] ${job.data.period}/${job.data.audience} → ${JSON.stringify(res.counts)}`));
