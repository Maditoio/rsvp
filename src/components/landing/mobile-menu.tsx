"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        className="p-2 text-ink-700"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-stone-200 bg-stone-0 p-6 shadow-md">
          <div className="flex flex-col gap-4">
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-stone-600"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-sm bg-ink-700 px-5 text-sm font-semibold text-white hover:bg-ink-800"
            >
              Start organising
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
