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
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.97)" : "transparent",
        boxShadow: scrolled ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
        backdropFilter: scrolled ? "blur(8px)" : "none",
      }}
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
          <span
            className="font-display text-xl font-semibold"
            style={{ color: scrolled ? "#3D3630" : "#FFFFFF" }}
          >
            Bizcon
          </span>
        </Link>
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/sign-in"
            className="text-sm font-medium transition-colors"
            style={{ color: scrolled ? "#7A7067" : "#D5CEC4" }}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex h-9 items-center rounded-sm px-5 text-sm font-semibold text-white transition-colors"
            style={{ background: "#B8864E" }}
          >
            Start organising
          </Link>
        </div>
        <MobileMenu scrolled={scrolled} />
      </div>
    </nav>
  );
}
