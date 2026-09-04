"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * Header navigation. Without this the only way between sections is the landing
 * page, so every inner page is a dead end. Links are role-scoped: showing a
 * citizen the triage queue only leads them to an "Officers only" wall.
 */
const LINKS: { href: string; label: string; roles: (UserRole | "guest")[] }[] = [
  { href: "/reports", label: "Reports", roles: ["guest", "citizen", "officer", "crew"] },
  { href: "/report", label: "Report a site", roles: ["citizen", "officer", "crew"] },
  { href: "/staff", label: "Triage", roles: ["officer"] },
  { href: "/dashboard", label: "Dashboard", roles: ["officer"] },
  { href: "/team", label: "My jobs", roles: ["crew"] },
];

export function NavLinks({ role }: { role: UserRole | null }) {
  const pathname = usePathname();
  const visible = LINKS.filter((link) => link.roles.includes(role ?? "guest"));

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {visible.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
