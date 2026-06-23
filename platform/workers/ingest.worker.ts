// ingest.worker.ts — ingest a regulatory version, run detection, persist, enqueue notify.
//
// Pipeline (see ARCHITECTURE §5): parse → diff → deterministic classification → AI draft.
// The raw ChangeComparison and the AI ChangeAssessment are persisted SEPARATELY, and an
// AuditLog row is appended for the AI generation step.

import { Worker } from "bullmq";
import { connection, QUEUES, notifyQueue, defaultJobOpts, type IngestJob } from "../lib/queue";
import { ChangeDetectionService } from "../lib/services/change-detection.service";
import { mockRegulatoryFeed } from "../lib/integrations/regulatory-feed/mock";
import { mockAiProvider } from "../lib/integrations/ai/mock";

const detector = new ChangeDetectionService(mockRegulatoryFeed, mockAiProvider);

export const ingestWorker = new Worker<IngestJob>(
  QUEUES.ingest,
  async (job) => {
    const { regulationRef, prevVersionLabel, currVersionLabel, organisationId } = job.data;

    const result = await detector.analyze(regulationRef, prevVersionLabel, currVersionLabel);

    // PRODUCTION: persist within one transaction —
    //   db.changeComparison.create({ rawDiff: result.comparison, diffStats: result.comparison.stats })
    //   db.changeEvent.create({ severity: result.severity, category..., status: result.changeStatus })
    //   db.changeAssessment.create({ summary: result.aiDraft.summary, lifecycle: "DRAFT",
    //                                confidence: result.aiDraft.confidence, aiAssisted: true })
    //   db.auditLog.create({ actorType: "AI_SERVICE", action: "Generated draft impact summary",
    //                        category: "AI", confidence: result.aiDraft.confidence })
    const changeRef = `CHG-${regulationRef}-${currVersionLabel}`;

    // critical/high → fire immediate notifications
    if (result.severity === "CRITICAL" || result.severity === "HIGH") {
      await notifyQueue.add("notify", { changeRef, organisationId }, defaultJobOpts);
    }

    return { changeRef, severity: result.severity, stats: result.comparison.stats };
  },
  { connection, concurrency: 4 },
);

ingestWorker.on("completed", (job, res) =>
  console.log(`[ingest] ${job.data.regulationRef} → ${res.severity} ${JSON.stringify(res.stats)}`));
ingestWorker.on("failed", (job, err) =>
  console.error(`[ingest] failed ${job?.data.regulationRef}: ${err.message}`));
