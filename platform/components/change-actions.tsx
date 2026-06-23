"use client";
import { useState } from "react";

// Decision/workflow buttons. "Publish approved assessment" is only shown when the server
// determined the current user holds approve_assessment (RBAC). The POST is also re-checked
// server-side in the API route — UI gating is convenience, not the security boundary.
export function ChangeActions({ changeId, canApprove }: { changeId: string; canApprove: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/changes/${changeId}/approve`, { method: "POST" });
      const body = await res.json();
      setMsg(res.ok ? `✓ ${body.message}` : `✗ ${body.error}`);
    } catch {
      setMsg("✗ Request failed");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button className="btn" onClick={() => setMsg("Marked as reviewed")}>Mark as reviewed</button>
      <button className="btn" onClick={() => setMsg("Legal review requested from External Reviewer (DLA)")}>Request legal review</button>
      <button className="btn" onClick={() => setMsg("Escalated to Executive LT")}>Escalate to executive</button>
      <button className="btn green" disabled={!canApprove || busy} onClick={approve}
        title={canApprove ? "" : "Requires approve_assessment permission"}>
        {busy ? "Publishing…" : "Publish approved assessment"}
      </button>
      {!canApprove && <div className="muted" style={{ fontSize: 11 }}>Your role can’t approve assessments.</div>}
      {msg && <div style={{ fontSize: 12, fontWeight: 600, color: msg.startsWith("✗") ? "var(--red)" : "var(--green)" }}>{msg}</div>}
    </div>
  );
}
