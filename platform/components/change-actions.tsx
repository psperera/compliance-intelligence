"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Decision/workflow buttons — all persist via the API and refresh the page.
// "Publish approved assessment" is gated on approve_assessment (server-enforced too).
export function ChangeActions({ changeId, canApprove }: { changeId: string; canApprove: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function setStatus(status: string, label: string) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/changes/${changeId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const d = await res.json();
      if (res.ok) { setMsg(`✓ ${label}`); router.refresh(); } else setMsg(`✗ ${d.error}`);
    } catch { setMsg("✗ Request failed"); } finally { setBusy(false); }
  }

  async function approve() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/changes/${changeId}/approve`, { method: "POST" });
      const d = await res.json();
      if (res.ok) { setMsg(`✓ ${d.message}`); router.refresh(); } else setMsg(`✗ ${d.error}`);
    } catch { setMsg("✗ Request failed"); } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button className="btn" disabled={busy} onClick={() => setStatus("Marked as reviewed", "Marked as reviewed")}>Mark as reviewed</button>
      <button className="btn" disabled={busy} onClick={() => setStatus("Expert review required", "Legal review requested")}>Request legal review</button>
      <button className="btn" disabled={busy} onClick={() => setStatus("Action plan created", "Action plan created")}>Create action plan</button>
      <button className="btn" disabled={busy} onClick={() => setStatus("Escalated", "Escalated to executive")}>Escalate to executive</button>
      <button className="btn green" disabled={!canApprove || busy} onClick={approve}
        title={canApprove ? "" : "Requires approve_assessment permission"}>
        {busy ? "Working…" : "Publish approved assessment"}
      </button>
      {!canApprove && <div className="muted" style={{ fontSize: 11 }}>Your role can’t approve assessments.</div>}
      {msg && <div style={{ fontSize: 12, fontWeight: 600, color: msg.startsWith("✗") ? "var(--red)" : "var(--green)" }}>{msg}</div>}
    </div>
  );
}
