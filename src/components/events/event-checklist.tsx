"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  FileSpreadsheet,
  Handshake,
  Mail,
  Megaphone,
  Settings2,
  Tags,
  UserPlus,
  ChartColumn,
  ChevronRight,
} from "lucide-react";
import {
  CHECKLIST_PHASES,
  type ChecklistItem,
  type ChecklistPhase,
  type ChecklistResult,
} from "@/modules/events/checklist";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof ClipboardList> = {
  event_details: Settings2,
  registration_form: ClipboardList,
  invite_list: FileSpreadsheet,
  public_apply: UserPlus,
  communications: Megaphone,
  categories: Tags,
  send_invites: Mail,
  applications_review: ClipboardList,
  agenda: CalendarDays,
  meeting_rooms: Handshake,
  matchmaking: Settings2,
  check_in: DoorOpen,
  reports: ChartColumn,
};

export function EventChecklist({
  checklist,
  defaultOpen = false,
}: {
  checklist: ChecklistResult;
  defaultOpen?: boolean;
}) {
  const [phase, setPhase] = useState<ChecklistPhase>("customize");
  const [dismissed, setDismissed] = useState(false);

  const phaseItems = useMemo(
    () => checklist.items.filter((item) => item.phase === phase),
    [checklist.items, phase],
  );

  const nextPhase = CHECKLIST_PHASES.find(
    (p) => CHECKLIST_PHASES.findIndex((x) => x.id === p.id) >
      CHECKLIST_PHASES.findIndex((x) => x.id === phase),
  );

  if (dismissed && checklist.percent >= 100) return null;
  if (!defaultOpen && checklist.percent >= 80 && dismissed) return null;

  return (
    <section className="mt-6 rounded-md border border-stone-200 bg-stone-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Event checklist
          </p>
          <p className="mt-1 text-sm text-stone-700">
            {checklist.completed} of {checklist.total} complete
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-stone-100 sm:block">
            <div
              className="h-full rounded-full bg-moss-500"
              style={{ width: `${checklist.percent}%` }}
            />
          </div>
          <Badge tone={checklist.percent === 100 ? "success" : "accent"}>
            {checklist.percent}% complete
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-stone-200 px-3 pt-3">
        {CHECKLIST_PHASES.map((p) => {
          const count = checklist.items.filter((i) => i.phase === p.id).length;
          const active = phase === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPhase(p.id)}
              className={cn(
                "relative rounded-sm px-3 py-2 text-sm transition-colors",
                active
                  ? "font-semibold text-bronze-700"
                  : "text-stone-600 hover:text-ink-800",
              )}
            >
              {p.label}
              <span className="ml-1 text-xs text-stone-400">({count})</span>
              {active ? (
                <span
                  className="absolute inset-x-3 bottom-0 h-0.5 bg-bronze-500"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <ul className="divide-y divide-stone-100">
        {phaseItems.map((item) => (
          <ChecklistRow key={item.id} item={item} />
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-3">
        {nextPhase ? (
          <button
            type="button"
            className="text-sm font-medium text-ink-700 hover:text-ink-800"
            onClick={() => setPhase(nextPhase.id)}
          >
            Next: {nextPhase.label} →
          </button>
        ) : (
          <button
            type="button"
            className="text-sm text-stone-500 hover:text-ink-700"
            onClick={() => setDismissed(true)}
          >
            Hide checklist
          </button>
        )}
      </div>
    </section>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const Icon = ICONS[item.id] ?? ClipboardList;
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md",
          item.complete ? "bg-moss-100 text-moss-700" : "bg-stone-100 text-stone-600",
        )}
      >
        {item.complete ? (
          <CheckCircle2 className="size-5" strokeWidth={1.75} aria-hidden />
        ) : (
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink-800">{item.title}</p>
          {item.optional ? (
            <span className="text-xs text-stone-500">(optional)</span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-stone-600">{item.description}</p>
        <div className="mt-2">
          <Badge tone={item.complete ? "success" : "muted"}>
            {item.complete ? "Complete" : "Pending"}
          </Badge>
        </div>
      </div>
      <Link
        href={item.href}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-sm border border-stone-300 px-3 text-sm font-semibold text-ink-700 hover:border-ink-400 hover:bg-stone-50"
      >
        {item.complete ? "Review" : "Open"}
        <ChevronRight className="size-3.5" aria-hidden />
      </Link>
    </li>
  );
}
