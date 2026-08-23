"use client";

import { MoreVertical } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ActionsMenuItem =
  | {
      type?: "item";
      id: string;
      label: string;
      onSelect: () => void;
      disabled?: boolean;
      icon?: ReactNode;
      destructive?: boolean;
    }
  | { type: "divider"; id: string };

export function ActionsMenu({
  items,
  disabled,
  align = "right",
}: {
  items: ActionsMenuItem[];
  disabled?: boolean;
  align?: "left" | "right";
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

  if (items.length === 0) return null;

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
          className={cn(
            "absolute top-9 z-30 w-[14.25rem] rounded-xl bg-white p-1.5 shadow-md",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <ul className="space-y-0.5">
            {items.map((item, index) => {
              if (item.type === "divider") {
                return (
                  <li key={item.id}>
                    <div
                      className={cn(
                        "border-t border-slate-100",
                        index === 0 ? "hidden" : "my-2",
                      )}
                    />
                  </li>
                );
              }
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled || disabled}
                    onClick={() => {
                      item.onSelect();
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm",
                      "hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
                      item.destructive
                        ? "text-danger hover:bg-danger-bg"
                        : "text-slate-700",
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
