"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Route } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/platform", label: "Overview", icon: LayoutDashboard, exact: true },
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
              "inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "border-l-[3px] border-l-ink-700 bg-stone-100 text-ink-700"
                : "text-stone-600 hover:bg-stone-50 hover:text-ink-700",
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
