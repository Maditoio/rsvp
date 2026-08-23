"use client";

import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type DrawerSize = "sm" | "md" | "lg";

function widthClass(size: DrawerSize) {
  if (size === "sm") return "sm:max-w-[420px]";
  if (size === "lg") return "sm:max-w-[560px]";
  return "sm:max-w-[480px]";
}

const panelClass =
  "absolute inset-y-0 right-0 flex w-full max-w-full flex-col bg-white shadow-lg rounded-none sm:rounded-l-xl aurora-drawer-enter";

export function Drawer({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: DrawerSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className={cn(panelClass, widthClass(size))}>
        <div className="flex items-start justify-between gap-4 px-6 py-6">
          <div>
            <h2 className="text-[1.1875rem] font-bold tracking-[-0.01em] text-slate-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer ? (
          <div className="bg-white px-6 py-4 shadow-[0_-1px_0_rgba(15,23,42,0.04),0_-4px_12px_rgba(15,23,42,0.03)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RouteDrawer({
  title,
  description,
  closeHref,
  size = "md",
  children,
}: {
  title: string;
  description?: string;
  closeHref: string;
  size?: DrawerSize;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <Link
        href={closeHref}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
      />
      <div className={cn(panelClass, widthClass(size))}>
        <div className="flex items-start justify-between gap-4 px-6 py-6">
          <div>
            <h1 className="text-[1.1875rem] font-bold tracking-[-0.01em] text-slate-900">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          <Link
            href={closeHref}
            className="inline-flex size-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          >
            ×
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
