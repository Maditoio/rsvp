"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CalendarDays, LayoutDashboard, Route } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/platform", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/platform/organisations", label: "Organisations", icon: Building2 },
  { href: "/platform/events", label: "Events", icon: CalendarDays },
  { href: "/platform/surfaces", label: "Surfaces", icon: Route },
] as const;

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-700",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
