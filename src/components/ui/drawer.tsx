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
        className="absolute inset-0 bg-ink-900/45"
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-full flex-col bg-stone-0 shadow-lg",
          "rounded-none sm:rounded-l-lg",
          widthClass(size),
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-6">
          <div>
            <h2 className="text-[1.125rem] font-semibold text-ink-700">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-stone-700">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-2 py-1 text-stone-700 hover:bg-stone-100"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer ? (
          <div className="border-t border-stone-200 bg-stone-0 px-6 py-4">
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
      <Link href={closeHref} className="absolute inset-0 bg-ink-900/45" />
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-full flex-col bg-stone-0 shadow-lg",
          "rounded-none sm:rounded-l-lg",
          widthClass(size),
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-6">
          <div>
            <h1 className="text-[1.125rem] font-semibold text-ink-700">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-stone-700">{description}</p>
            ) : null}
          </div>
          <Link
            href={closeHref}
            className="rounded-sm px-2 py-1 text-stone-700 hover:bg-stone-100"
          >
            ×
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
