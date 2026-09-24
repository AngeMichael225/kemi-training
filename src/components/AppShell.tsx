"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Dumbbell, House, LibraryBig, TrendingUp, UserRound } from "lucide-react";
import { SyncStatus } from "@/components/SyncStatus";

const items = [
  { href: "/today", label: "Aujourd'hui", icon: House },
  { href: "/plan", label: "Programme", icon: Dumbbell },
  { href: "/progress", label: "Progression", icon: TrendingUp },
  { href: "/exercises", label: "Exercices", icon: LibraryBig },
  { href: "/profile", label: "Profil", icon: UserRound },
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
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/today" && pathname.startsWith(`${href}/`));
              return (
                <Link key={href} href={href} className="nav-link" data-active={active} aria-current={active ? "page" : undefined}>
                  <Icon size={19} strokeWidth={2.3} aria-hidden="true" />
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
