"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon, type UIconName } from "@/components/icons/Icon";
import { SyncStatus } from "@/components/SyncStatus";

const items: { href: string; label: string; icon: UIconName }[] = [
  { href: "/today", label: "Aujourd'hui", icon: "home" },
  { href: "/plan", label: "Programme", icon: "calendar" },
  { href: "/progress", label: "Progression", icon: "chart-line-up" },
  { href: "/exercises", label: "Exercices", icon: "list" },
  { href: "/profile", label: "Profil", icon: "user" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/session/");
  return (
    <div className="app-frame">
      <main className="app-main">{children}</main>
      {!hideNav ? (
        <nav className="bottom-nav" aria-label="Navigation principale">
          <div className="bottom-nav-inner">
            {items.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== "/today" && pathname.startsWith(`${href}/`));
              return (
                <Link key={href} href={href} className="nav-link" data-active={active} aria-current={active ? "page" : undefined}>
                  <Icon name={icon} size={19} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
      <div style={{ position: "fixed", top: "max(10px, var(--safe-top))", right: 14, zIndex: 90 }}>
        <SyncStatus compact />
      </div>
    </div>
  );
}
