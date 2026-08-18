import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  label,
  icon: Icon,
  active,
  nested = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-sm border-l-[3px] py-2 text-sm transition-colors",
        nested ? "pl-5 pr-3" : "px-3",
        active
          ? "border-l-ink-700 bg-stone-100 font-semibold text-ink-700"
          : "border-l-transparent text-stone-700 hover:bg-stone-100 hover:text-ink-700",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}
