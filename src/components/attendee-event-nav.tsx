import Link from "next/link";
import { cn } from "@/lib/utils";

export function AttendeeEventNav({
  eventId,
  current,
}: {
  eventId: string;
  current: string;
}) {
  const items = [
    { href: `/me/events/${eventId}`, label: "Overview" },
    { href: `/me/events/${eventId}/profile`, label: "Profile" },
    { href: `/me/events/${eventId}/privacy`, label: "Privacy" },
    { href: `/me/events/${eventId}/agenda`, label: "Agenda" },
    { href: `/me/events/${eventId}/directory`, label: "Directory" },
    { href: `/me/events/${eventId}/matchmaking`, label: "Matching" },
    { href: `/me/events/${eventId}/meetings`, label: "Meetings" },
    { href: `/me/events/${eventId}/qr`, label: "Check-in code" },
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "rounded-sm border border-stone-200 border-l-[3px] px-3 py-2 text-sm transition-colors",
            current === item.label
              ? "border-l-ink-700 bg-stone-100 font-semibold text-ink-700"
              : "border-l-transparent bg-stone-0 text-stone-700 hover:bg-stone-100 hover:text-ink-700",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
