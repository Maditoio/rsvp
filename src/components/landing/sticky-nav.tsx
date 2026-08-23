"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { MobileMenu } from "./mobile-menu";

export function StickyNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/97 shadow-[0_1px_0_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] backdrop-blur-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-6">
        <Link href="/" className="inline-flex items-center gap-2.5 hover:opacity-90">
          <Image
            src="/brand/logo-192.png"
            alt=""
            width={32}
            height={32}
            className="rounded-md"
            priority
          />
          <span className="text-xl font-bold tracking-[-0.02em] text-slate-900">Bizcon</span>
        </Link>
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-9 items-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-accent transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-indigo-700"
          >
            Start organising
          </Link>
        </div>
        <MobileMenu />
      </div>
    </nav>
  );
}
