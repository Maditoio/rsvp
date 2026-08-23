"use client";

import { Check, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type RoleOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function RowActionsMenu({
  changeRoleHeading,
  roles,
  currentRole,
  onSelectRole,
  removeLabel,
  onRemove,
  removeDisabled,
  disabled,
}: {
  changeRoleHeading: string;
  roles: RoleOption[];
  currentRole: string;
  onSelectRole: (role: string) => void;
  removeLabel: string;
  onRemove: () => void;
  removeDisabled?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex justify-end">
      <button
        type="button"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex size-[30px] items-center justify-center rounded-full text-slate-600",
          "hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <MoreVertical className="size-4" strokeWidth={1.75} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute top-9 right-0 z-30 w-[14.25rem] rounded-md bg-white p-1.5 shadow-md"
        >
          <p className="px-2.5 py-1.5 text-[0.71875rem] font-semibold tracking-[0.04em] text-slate-400 uppercase">
            {changeRoleHeading}
          </p>
          <ul className="space-y-0.5">
            {roles.map((role) => {
              const selected = role.value === currentRole;
              return (
                <li key={role.value}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    disabled={role.disabled || disabled}
                    onClick={() => {
                      if (role.value === currentRole) {
                        setOpen(false);
                        return;
                      }
                      onSelectRole(role.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-9 w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-sm text-slate-700",
                      "hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400",
                      selected && "bg-indigo-50 font-semibold text-indigo-700",
                    )}
                  >
                    <span>{role.label}</span>
                    {selected ? (
                      <Check className="size-3.5 shrink-0 text-indigo-600" strokeWidth={2} />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="my-1.5 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            disabled={removeDisabled || disabled}
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm",
              "text-danger hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <Trash2 className="size-3.5 shrink-0" strokeWidth={1.75} />
            {removeLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
