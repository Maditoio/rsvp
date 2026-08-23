import type { EventRole, OrgRole } from "@prisma/client";
import { cn, humanizeEnum } from "@/lib/utils";
import { eventRoleLabel } from "@/modules/workspaces/labels";

/** Soft accent pills for role/permission tags — not status dots. */
export type RoleTier = 1 | 2 | 3;

export function orgRoleTier(role: OrgRole): RoleTier {
  if (role === "OWNER") return 1;
  return 2;
}

export function eventRoleTier(role: EventRole): RoleTier {
  switch (role) {
    case "EVENT_ADMINISTRATOR":
      return 1;
    case "REGISTRATION_MANAGER":
      return 2;
    case "CHECKIN_STAFF":
    default:
      return 3;
  }
}

const tierClass: Record<RoleTier, string> = {
  1: "bg-indigo-50 text-indigo-700",
  2: "bg-violet-500/10 text-violet-700",
  3: "bg-slate-100 text-slate-600",
};

export function RoleTag({
  label,
  tier,
  className,
}: {
  label: string;
  tier: RoleTier;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[0.71875rem] font-semibold tracking-[0.01em]",
        tierClass[tier],
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Absence of a role — never a tag. */
export function RoleAbsence({ children }: { children: string }) {
  return (
    <span className="text-[0.8125rem] text-slate-400">{children}</span>
  );
}

export function OrgRoleTag({ role }: { role: OrgRole }) {
  return <RoleTag label={humanizeEnum(role)} tier={orgRoleTier(role)} />;
}

export function EventRoleTag({ role }: { role: EventRole }) {
  return <RoleTag label={eventRoleLabel(role)} tier={eventRoleTier(role)} />;
}
