import { Nav } from "../../components/nav";
import { Fom } from "../../components/fom";
import { CURRENT_USER_DISPLAY } from "../../lib/auth/current-user";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const u = CURRENT_USER_DISPLAY;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">CI</div>
          <div><b>Compliance Intelligence</b><span>Waygate Technologies</span></div>
        </div>
        <Nav />
        <div className="sb-foot">
          <div className="who">
            <div className="av">{u.initials}</div>
            <div><div style={{ color: "#fff", fontWeight: 600 }}>{u.name}</div><div>{u.title}</div></div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="search"><input placeholder="Search regulations, clauses, sites, actions…" /></div>
          <div className="tb-select">Jurisdiction: <b>All</b></div>
          <div className="tb-select">Site: <b>All</b></div>
          <div className="tb-right">
            <div className="av-sq">{u.initials}</div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>

      {/* HS.ai — AI compliance assistant (local LLM via Ollama by default) */}
      <Fom />
    </div>
  );
}
