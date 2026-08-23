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
    "flex items-center gap-2 rounded-full text-sm transition-colors duration-150 ease-out",
    collapsed
      ? "mx-auto h-[38px] w-[38px] justify-center p-0"
      : "h-[38px] px-3.5",
    active
      ? "bg-indigo-50 font-semibold text-indigo-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    disabled && "cursor-not-allowed opacity-60 hover:bg-transparent hover:text-slate-600",
  );

  const iconCls = cn(
    "size-4 shrink-0",
    active ? "text-indigo-600" : undefined,
  );

  if (disabled) {
    return (
      <span className={cls} title={label}>
        <Icon className={iconCls} strokeWidth={1.75} aria-hidden />
        {!collapsed && <span className="truncate">{label}</span>}
      </span>
    );
  }

  return (
    <Link href={href} className={cls} title={collapsed ? label : undefined}>
      <Icon className={iconCls} strokeWidth={1.75} aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
