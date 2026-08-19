import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  disabled,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  collapsed?: boolean;
  disabled?: boolean;
}) {
  const cls = cn(
    "flex items-center gap-2 rounded-sm border-l-[3px] text-sm transition-colors",
    collapsed
      ? "mx-auto h-[38px] w-[38px] justify-center border-l-0 p-0"
      : "h-[34px] px-2",
    active
      ? collapsed
        ? "bg-stone-100 text-ink-700"
        : "border-l-ink-700 bg-stone-100 font-semibold text-ink-700"
      : "border-l-transparent text-stone-600 hover:bg-stone-100 hover:text-ink-700",
    disabled && "cursor-not-allowed opacity-60 hover:bg-transparent hover:text-stone-600",
  );

  if (disabled) {
    return (
      <span className={cls} title={label}>
        <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
    );
  }

  return (
    <Link href={href} className={cls} title={collapsed ? label : undefined}>
      <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
