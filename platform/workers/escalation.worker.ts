// escalation.worker.ts — periodic check for unassigned changes and overdue actions.
//
// Runs on a repeatable schedule (every hour). Evaluates the pure escalation rules and
// dispatches escalation alerts to the responsible role (Group HS&E Director by default).

import { Worker } from "bullmq";
import { connection, QUEUES, type EscalationJob } from "../lib/queue";
import { evaluateEscalations, type ChangeRecord, type ActionRecord } from "../lib/services/escalation.service";
import { mockEmailProvider } from "../lib/integrations/email/mock";

// PRODUCTION: load from DB.
async function loadOpenChanges(_orgId: string): Promise<ChangeRecord[]> { return []; }
async function loadOpenActions(_orgId: string): Promise<ActionRecord[]> { return []; }
async function emailForRole(_roleKey: string, _orgId: string): Promise<string[]> { return []; }

export const escalationWorker = new Worker<EscalationJob>(
  QUEUES.escalation,
  async (job) => {
    const now = new Date();
    const [changes, actions] = await Promise.all([
      loadOpenChanges(job.data.organisationId),
      loadOpenActions(job.data.organisationId),
    ]);

    const escalations = evaluateEscalations(now, changes, actions);
    for (const e of escalations) {
      const to = await emailForRole(e.escalateTo, job.data.organisationId);
      if (to.length === 0) continue;
      await mockEmailProvider.send({
        to,
        subject: `Escalation: ${e.kind === "OVERDUE_ACTION" ? "overdue action" : "unassigned change"} ${e.ref}`,
        html: `<p><b>${e.title}</b></p><p>${e.reason}</p>`,
        text: `${e.title}\n${e.reason}`,
        tags: { escalation: e.kind, ref: e.ref },
      });
      // PRODUCTION: write AuditLog (category ESCALATION) + update Alert status = ESCALATED.
    }
    return { escalated: escalations.length };
  },
  { connection },
);

escalationWorker.on("completed", (_job, res) => console.log(`[escalation] ${JSON.stringify(res)}`));
