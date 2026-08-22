import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = (orgSlug: string, eventId: string) =>
  [
    {
      href: `/app/${orgSlug}/events/${eventId}/day`,
      label: "Scan",
      icon: QrCode,
      exact: true,
    },
    {
      href: `/app/${orgSlug}/events/${eventId}/day/lookup`,
      label: "Lookup",
      icon: Search,
    },
  ] as const;

export function EventDayShell({
  orgSlug,
  eventId,
  eventName,
  children,
}: {
  orgSlug: string;
  eventId: string;
  eventName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = tabs(orgSlug, eventId);

  return (
    <div className="flex min-h-full flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-0">
        <div className="px-4 py-4 sm:px-6">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Event day
          </p>
          <h1 className="mt-1 font-display text-2xl text-ink-800 sm:text-3xl">
            {eventName}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Staff check-in — scan QR codes or look up delegates by name.
          </p>
        </div>
        <nav
          className="flex gap-1 border-t border-stone-100 px-4 sm:px-6"
          aria-label="Event day"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              "exact" in item && item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative inline-flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "text-bronze-700"
                    : "text-stone-600 hover:text-ink-800",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {item.label}
                {active ? (
                  <span
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-bronze-500"
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="flex-1 px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
