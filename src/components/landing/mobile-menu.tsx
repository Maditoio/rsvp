"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileMenu({ scrolled }: { scrolled: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        className="p-2"
      >
        {open ? (
          <X className="h-5 w-5" style={{ color: scrolled ? "#3D3630" : "#FFFFFF" }} />
        ) : (
          <Menu className="h-5 w-5" style={{ color: scrolled ? "#3D3630" : "#FFFFFF" }} />
        )}
      </button>
      {open && (
        <div
          className="absolute inset-x-0 top-16 border-b p-6"
          style={{ background: "#FFFFFF", borderColor: "#E8E0D6" }}
        >
          <div className="flex flex-col gap-4">
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="text-sm font-medium"
              style={{ color: "#7A7067" }}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-sm px-5 text-sm font-semibold text-white"
              style={{ background: "#B8864E" }}
            >
              Start organising
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
