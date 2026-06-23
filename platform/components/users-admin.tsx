"use client";
import { useEffect, useState } from "react";

type User = { id: string; name: string; email: string; title: string; role: string; scopeType: string; scope: string[]; status: string; createdAt: string };

const ROLES = [
  ["PLATFORM_ADMIN", "Platform Administrator"], ["COMPLIANCE_DIRECTOR", "Corporate Compliance Director"],
  ["LEGAL_LEAD", "Corporate Legal Lead"], ["REGIONAL_HSE_MANAGER", "Regional HS&E Manager"],
  ["SITE_MANAGER", "Site Manager"], ["REGULATORY_ANALYST", "Regulatory Analyst"],
  ["BUSINESS_LINE_LEADER", "Business Line Leader"], ["INTERNAL_AUDITOR", "Internal Auditor"],
  ["READONLY_EXECUTIVE", "Read-only Executive"], ["EXTERNAL_REVIEWER", "External Expert Reviewer"],
] as const;
const SCOPES = ["GLOBAL", "REGION", "SITE"];
const statusPill = (s: string) => s === "ACTIVE" ? "p-green" : s === "INVITED" ? "p-amber" : "p-grey";

export function UsersAdmin({ canManage }: { canManage: boolean }) {
  const [users, setUsers] = useState<User[]>([]);
  const [meId, setMeId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", title: "", role: "SITE_MANAGER", scopeType: "GLOBAL", scope: "" });

  const load = () => fetch("/api/admin/users").then((r) => r.json()).then((d) => { setUsers(d.users ?? []); setMeId(d.currentUserId ?? ""); });
  useEffect(() => { load(); }, []);

  async function remove(id: string, name: string) {
    if (!window.confirm(`Remove ${name}? This revokes their access.`)) return;
    setMsg(null);
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) { setMsg(`✓ Removed ${d.removed}`); load(); } else setMsg(`✗ ${d.error}`);
  }

  async function addUser() {
    setMsg(null);
    const body = { ...form, scope: form.scope ? form.scope.split(",").map((s) => s.trim()).filter(Boolean) : [] };
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json();
    if (res.ok) { setMsg(`✓ Invited ${d.user.name} (${d.user.email}) as ${d.user.role}`); setOpen(false); setForm({ name: "", email: "", title: "", role: "SITE_MANAGER", scopeType: "GLOBAL", scope: "" }); load(); }
    else setMsg(`✗ ${d.error}`);
  }

  async function patch(id: string, patch: Record<string, unknown>) {
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    if (res.ok) load(); else { const d = await res.json(); setMsg(`✗ ${d.error}`); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>{users.length} users · manage roles, scope and access</span>
        {canManage && <button className="btn primary sm" onClick={() => setOpen(!open)}>{open ? "Cancel" : "+ Invite user"}</button>}
      </div>

      {open && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 14, background: "#fafbfc" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={lbl}>Name<input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" /></label>
            <label style={lbl}>Email<input style={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="j.doe@waygate.example" /></label>
            <label style={lbl}>Title<input style={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Site Manager — Hürth" /></label>
            <label style={lbl}>Role<select style={inp} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label style={lbl}>Access scope<select style={inp} value={form.scopeType} onChange={(e) => setForm({ ...form, scopeType: e.target.value })}>{SCOPES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label style={lbl}>Scope values{form.scopeType === "GLOBAL" ? <input style={{ ...inp, opacity: .5 }} disabled placeholder="all sites" /> : <input style={inp} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder={form.scopeType === "SITE" ? "changzhou, coventry" : "Europe (DACH)"} />}</label>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn primary" onClick={addUser}>Send invite</button>
            <span className="muted" style={{ fontSize: 11, alignSelf: "center" }}>New users start as <b>Invited</b> (an invite email is sent in production).</span>
          </div>
        </div>
      )}

      {msg && <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: msg.startsWith("✗") ? "var(--red)" : "var(--green)" }}>{msg}</div>}

      <div className="tablewrap"><table className="tbl">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Scope</th><th>Status</th>{canManage && <th>Manage access</th>}</tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u.id}>
            <td className="ttl">{u.name}<div className="sm">{u.title}</div></td>
            <td className="sm">{u.email}</td>
            <td>{canManage
              ? <select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })} style={{ ...inp, padding: "5px 8px", fontSize: 12 }}>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              : <span className="sm">{ROLES.find((r) => r[0] === u.role)?.[1]}</span>}</td>
            <td className="sm">{u.scopeType === "GLOBAL" ? "Global" : `${u.scopeType}: ${u.scope.join(", ")}`}</td>
            <td><span className={`pill ${statusPill(u.status)}`}><span className="pd" />{u.status[0] + u.status.slice(1).toLowerCase()}</span></td>
            {canManage && <td>
              <div style={{ display: "flex", gap: 6 }}>
                {u.status !== "ACTIVE" && <button className="btn sm" onClick={() => patch(u.id, { status: "ACTIVE" })}>Activate</button>}
                {u.status === "ACTIVE" && <button className="btn sm" onClick={() => patch(u.id, { status: "SUSPENDED" })}>Suspend</button>}
                {u.id !== meId && <button className="btn sm" style={{ color: "var(--red)", borderColor: "#f1c2bf" }} onClick={() => remove(u.id, u.name)}>Remove</button>}
              </div>
            </td>}
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, fontWeight: 600, color: "var(--muted)" };
const inp: React.CSSProperties = { padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, color: "var(--ink)", background: "#fff" };
