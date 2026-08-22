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
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-stone-200 bg-stone-0/97 shadow-sm backdrop-blur-sm"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="inline-flex items-center gap-2.5 hover:opacity-90">
          <Image
            src="/brand/logo-192.png"
            alt=""
            width={32}
            height={32}
            className="rounded-sm"
            priority
          />
          <span className="font-display text-xl font-semibold text-ink-700">Bizcon</span>
        </Link>
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-stone-600 transition-colors hover:text-ink-700"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-9 items-center rounded-sm bg-ink-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
          >
            Start organising
          </Link>
        </div>
        <MobileMenu />
      </div>
    </nav>
  );
}
