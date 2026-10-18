import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminContext } from "@/lib/auth";

const nav = [
  { href: "/", icon: "◈", label: "Overview" },
  { href: "/users", icon: "♙", label: "Users" },
  { href: "/media", icon: "▧", label: "AI media" },
  { href: "/votes", icon: "↗", label: "Votes" },
];

export function AdminShell({ children, context, active }: { children: ReactNode; context: AdminContext; active: string }) {
  const display = [context.profile.first_name, context.profile.last_name].filter(Boolean).join(" ") || context.user.email || "Super admin";
  return <div className="app-frame">
    <aside className="sidebar">
      <Link className="brand" href="/"><span className="brand-mark">h.</span><span><b>humor project</b><small>CONTROL ROOM</small></span></Link>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list" aria-label="Admin navigation">{nav.map((item) => <Link key={item.href} className={`nav-link ${active === item.href ? "active" : ""}`} href={item.href}><span className="nav-icon">{item.icon}</span>{item.label}{active === item.href && <i />}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="live-pill"><span />Production systems operational</div><div className="user-chip"><span className="avatar">{display.slice(0, 1).toUpperCase()}</span><span className="user-meta"><b>{display}</b><small>SUPER ADMIN</small></span><form action="/auth/logout" method="post"><button className="logout" aria-label="Sign out" title="Sign out">↪</button></form></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumb">The Humor Project <span>/</span> <b>{nav.find((item) => item.href === active)?.label}</b></div><div className="top-actions"><span className="environment"><i /> LIVE</span><span className="top-date">ADMIN CONSOLE</span></div></header>{children}</main>
  </div>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}
