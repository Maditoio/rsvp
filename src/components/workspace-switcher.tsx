"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  LayoutGrid,
  QrCode,
  Shield,
  UserRound,
} from "lucide-react";
import { matchWorkspaceFromPath } from "@/modules/workspaces/match-path";
import {
  WORKSPACE_KIND_LABELS,
  type UserWorkspace,
  type WorkspaceKind,
} from "@/modules/workspaces/types";
import { cn } from "@/lib/utils";

const KIND_ORDER: WorkspaceKind[] = [
  "attendee",
  "organiser",
  "event_operations",
  "platform",
];

function kindIcon(kind: WorkspaceKind) {
  switch (kind) {
    case "attendee":
      return UserRound;
    case "organiser":
      return Building2;
    case "event_operations":
      return QrCode;
    case "platform":
      return Shield;
    default:
      return LayoutGrid;
  }
}

function groupWorkspaces(workspaces: UserWorkspace[]) {
  return KIND_ORDER.map((kind) => ({
    kind,
    label: WORKSPACE_KIND_LABELS[kind],
    items: workspaces.filter((w) => w.kind === kind),
  })).filter((group) => group.items.length > 0);
}

export function WorkspaceSwitcher({
  workspaces,
  compact = false,
  menuAlign = "right",
}: {
  workspaces: UserWorkspace[];
  compact?: boolean;
  /** Dropdown opens toward this side of the trigger. */
  menuAlign?: "left" | "right";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = useMemo(
    () => matchWorkspaceFromPath(pathname, workspaces),
    [pathname, workspaces],
  );

  const groups = useMemo(() => groupWorkspaces(workspaces), [workspaces]);
  const hasMultiple = workspaces.length > 1;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (workspaces.length === 0) return null;

  if (!hasMultiple) {
    const only = workspaces[0];
    const Icon = kindIcon(only.kind);
    return (
      <Link
        href={only.href}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100",
          compact && "max-w-[12rem]",
        )}
        title={only.description}
      >
        <Icon className="size-3.5 shrink-0 text-slate-500" strokeWidth={1.75} />
        <span className={cn("truncate font-medium", compact && "text-xs")}>
          {only.label}
        </span>
      </Link>
    );
  }

  const CurrentIcon = current ? kindIcon(current.kind) : LayoutGrid;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50",
          compact ? "max-w-[9.5rem]" : "min-w-[10rem]",
        )}
      >
        <CurrentIcon
          className="size-3.5 shrink-0 text-indigo-600"
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-left font-medium">
          {current?.label ?? "Switch workspace"}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-30 mt-1 w-72 rounded-md bg-white py-1.5 shadow-md",
            menuAlign === "left" ? "left-0" : "right-0",
          )}
        >
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
              Workspaces
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Switch between attendee, organiser, and platform surfaces.
            </p>
          </div>
          <Link
            href="/home"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            <LayoutGrid className="size-3.5 shrink-0" strokeWidth={1.75} />
            All workspaces
          </Link>
          {groups.map((group) => (
            <div key={group.kind} className="border-t border-slate-100 py-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {group.label}
              </p>
              {group.items.map((workspace) => {
                const Icon = kindIcon(workspace.kind);
                const active = current?.id === workspace.id;
                return (
                  <Link
                    key={workspace.id}
                    href={workspace.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-start gap-2 px-3 py-2 text-sm hover:bg-slate-50",
                      active
                        ? "bg-slate-50 font-medium text-slate-900"
                        : "text-slate-700 hover:text-slate-900",
                    )}
                  >
                    <Icon
                      className="mt-0.5 size-3.5 shrink-0 text-slate-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{workspace.label}</span>
                      <span className="block truncate text-xs font-normal text-slate-500">
                        {workspace.description}
                      </span>
                    </span>
                    {active ? (
                      <BadgeCheck
                        className="ml-auto size-3.5 shrink-0 text-success"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
