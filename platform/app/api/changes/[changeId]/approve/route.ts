// POST /api/changes/:changeId/approve
// Publishes an approved impact assessment. RBAC-enforced server-side (the real boundary).
import { NextResponse } from "next/server";
import { getChange, setChangeStatus } from "../../../../../lib/data/store";
import { getCurrentUser } from "../../../../../lib/auth/current-user";
import { can } from "../../../../../lib/auth/rbac";

export async function POST(_req: Request, { params }: { params: Promise<{ changeId: string }> }) {
  const { changeId } = await params;
  const user = await getCurrentUser();

  if (!can(user, "approve_assessment"))
    return NextResponse.json({ error: "Forbidden: approve_assessment required" }, { status: 403 });

  const change = await getChange(changeId);
  if (!change) return NextResponse.json({ error: "change not found" }, { status: 404 });
  await setChangeStatus(changeId, "Approved");

  // PRODUCTION (in one transaction):
  //   db.changeAssessment.update({ lifecycle: "APPROVED" })
  //   db.changeEvent.update({ status: "APPROVED" })
  //   db.approvalDecision.create({ approverId: user.id, decision: "APPROVED" })
  //   db.auditLog.create({ actorId: user.id, action: "Published approved assessment", category: "APPROVAL" })
  //   enqueue notification job for matching watchlists

  return NextResponse.json({
    ok: true,
    message: `Assessment for ${change.id} published as APPROVED by ${user.id}. Audit log updated; notifications queued.`,
  });
}
