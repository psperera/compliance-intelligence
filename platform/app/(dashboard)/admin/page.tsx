import { getCurrentUser } from "../../../lib/auth/current-user";
import { can, ROLE_PERMISSIONS, PERMISSIONS, type RoleKey } from "../../../lib/auth/rbac";
import { AiProviderMenu } from "../../../components/ai-provider-menu";
import { UsersAdmin } from "../../../components/users-admin";
import { Crumbs, PageHead } from "../../../components/ui";

const ROLE_LABELS: Record<RoleKey, string> = {
  PLATFORM_ADMIN: "Platform Administrator", COMPLIANCE_DIRECTOR: "Corporate Compliance Director",
  LEGAL_LEAD: "Corporate Legal Lead", REGIONAL_HSE_MANAGER: "Regional HS&E Manager",
  SITE_MANAGER: "Site Manager", REGULATORY_ANALYST: "Regulatory Analyst",
  BUSINESS_LINE_LEADER: "Business Line Leader", INTERNAL_AUDITOR: "Internal Auditor",
  READONLY_EXECUTIVE: "Read-only Executive", EXTERNAL_REVIEWER: "External Expert Reviewer",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  const isAdmin = can(user, "manage_users");
  const roles = Object.keys(ROLE_PERMISSIONS) as RoleKey[];

  return (
    <>
      <Crumbs items={["Administration"]} />
      <PageHead title="Administration" subtitle="AI assistant configuration · roles & permissions · audit." />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="ch"><h3>FOM — AI assistant provider</h3><span className="sub">Local LLM by default; switch to a cloud provider</span></div>
        <div className="cb">
          {isAdmin ? <AiProviderMenu /> : <div className="muted">Your role can’t change the AI provider (requires admin).</div>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="ch"><h3>Users &amp; access</h3><span className="sub">Add users, set emails, assign roles &amp; scope</span></div>
        <div className="cb"><UsersAdmin canManage={isAdmin} /></div>
      </div>

      <div className="card">
        <div className="ch"><h3>Role permission matrix</h3></div>
        <div className="tablewrap"><table className="tbl">
          <thead><tr><th>Role</th>{PERMISSIONS.map((p) => (
            <th key={p} style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 130, textTransform: "none", letterSpacing: 0, fontSize: 10.5 }}>{p.replace(/_/g, " ")}</th>
          ))}</tr></thead>
          <tbody>{roles.map((r) => (
            <tr key={r}>
              <td className="ttl" style={{ whiteSpace: "nowrap" }}>{ROLE_LABELS[r]}</td>
              {PERMISSIONS.map((p) => (
                <td key={p} style={{ textAlign: "center" }}>
                  {ROLE_PERMISSIONS[r].includes(p) ? <span style={{ color: "var(--green)", fontWeight: 800 }}>✓</span> : <span style={{ color: "var(--line)" }}>—</span>}
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </>
  );
}
