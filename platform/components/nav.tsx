"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { sec: string; items: { href: string; label: string; badge?: string }[] }[] = [
  { sec: "Overview", items: [{ href: "/", label: "Executive Overview" }] },
  { sec: "Regulatory Intelligence", items: [
    { href: "/baseline", label: "Regulatory Baseline", badge: "16" },
    { href: "/change", label: "Change Control", badge: "8" },
    { href: "/forecaster", label: "Regulatory Forecaster" },
  ] },
  { sec: "Accountability", items: [
    { href: "/sites", label: "Sites" },
    { href: "/actions", label: "Actions", badge: "2" },
  ] },
  { sec: "Insight & Control", items: [
    { href: "/admin", label: "Administration" },
  ] },
];

export function Nav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="nav">
      {NAV.map((g) => (
        <div className="navsec" key={g.sec}>
          <div className="lbl">{g.sec}</div>
          {g.items.map((it) => (
            <Link key={it.href} href={it.href} className={isActive(it.href) ? "active" : ""}>
              {it.label}{it.badge && <span className="badge">{it.badge}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
