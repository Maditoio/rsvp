import Link from "next/link";
import { cn } from "@/lib/utils";

const LEGAL_LINKS = [
  { href: "/privacystatment", label: "Privacy" },
  { href: "/termsofservice", label: "Terms" },
  { href: "/contact", label: "Contact" },
] as const;

export function AppFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-slate-400">© {year} Bizcon</p>
        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1"
        >
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-600 transition-colors hover:text-indigo-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
