// escalation.service.ts — time-based escalation rules (pure + unit-tested).
//
// Rules (from ARCHITECTURE §6 / notification rules):
//   • A change with no assigned owner for > 48h since detection → escalate.
//   • An action overdue by > 7 days (past due, not complete/closed) → escalate.
// The escalation worker runs this on a schedule and dispatches the resulting alerts.

const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;

export const UNASSIGNED_THRESHOLD_HOURS = 48;
export const OVERDUE_THRESHOLD_DAYS = 7;

export interface ChangeRecord {
  ref: string;
  title: string;
  detectedAt: string;     // ISO
  ownerId?: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
}

export interface ActionRecord {
  ref: string;
  title: string;
  dueDate?: string | null; // ISO
  status: string;          // "Overdue", "In progress", "Complete", ...
  ownerId?: string | null;
  ownerName?: string;
  siteRef?: string;
}

export type EscalationKind = "UNASSIGNED_CHANGE" | "OVERDUE_ACTION";

export interface Escalation {
  kind: EscalationKind;
  ref: string;
  title: string;
  reason: string;
  ageHours?: number;
  daysOverdue?: number;
  escalateTo: string; // role key that receives the escalation
}

const CLOSED = new Set(["complete", "closed", "not applicable"]);

export function evaluateEscalations(
  now: Date,
  changes: ChangeRecord[],
  actions: ActionRecord[],
): Escalation[] {
  const out: Escalation[] = [];

  for (const c of changes) {
    if (c.ownerId) continue;
    const ageHours = Math.floor((now.getTime() - new Date(c.detectedAt).getTime()) / HOUR);
    if (ageHours > UNASSIGNED_THRESHOLD_HOURS) {
      out.push({
        kind: "UNASSIGNED_CHANGE",
        ref: c.ref,
        title: c.title,
        ageHours,
        reason: `No owner assigned ${ageHours}h after detection (threshold ${UNASSIGNED_THRESHOLD_HOURS}h).`,
        // critical/high go straight to the group director; otherwise the regional manager
        escalateTo: c.severity === "CRITICAL" || c.severity === "HIGH" ? "PLATFORM_ADMIN" : "REGIONAL_HSE_MANAGER",
      });
    }
  }

  for (const a of actions) {
    if (!a.dueDate) continue;
    if (CLOSED.has(a.status.toLowerCase())) continue;
    const daysOverdue = Math.floor((now.getTime() - new Date(a.dueDate).getTime()) / DAY);
    if (daysOverdue > OVERDUE_THRESHOLD_DAYS) {
      out.push({
        kind: "OVERDUE_ACTION",
        ref: a.ref,
        title: a.title,
        daysOverdue,
        reason: `Action overdue by ${daysOverdue} days (threshold ${OVERDUE_THRESHOLD_DAYS}). Owner: ${a.ownerName ?? "unassigned"}.`,
        escalateTo: "PLATFORM_ADMIN", // Group HS&E Director
      });
    }
  }

  // most urgent first
  return out.sort((x, y) => (y.daysOverdue ?? y.ageHours ?? 0) - (x.daysOverdue ?? x.ageHours ?? 0));
}
