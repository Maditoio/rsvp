import Link from "next/link";
import { eventNav } from "@/components/nav";
import { hasPermission, type Permission } from "@/lib/authz/permissions";
import { cn } from "@/lib/utils";

export function EventSubnav({
  orgSlug,
  eventId,
  current,
  grants,
}: {
  orgSlug: string;
  eventId: string;
  current?: string;
  grants?: Permission[];
}) {
  const items = eventNav(orgSlug, eventId).filter((item) => {
    if ("soon" in item && item.soon) {
      if (!grants) return true;
      return (
        hasPermission(grants, "event.update") ||
        hasPermission(grants, "invitations.read")
      );
    }
    if (grants && "permission" in item) {
      return hasPermission(grants, item.permission);
    }
    return true;
  });

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.label}
          href={"soon" in item && item.soon ? "#" : item.href}
          className={cn(
            "rounded-sm border border-stone-200 border-l-[3px] px-3 py-2 text-sm transition-colors",
            current === item.label
              ? "border-l-ink-700 bg-stone-100 text-ink-700 font-semibold"
              : "soon" in item && item.soon
                ? "border-l-stone-300 bg-stone-100 text-stone-400"
                : "border-l-transparent bg-stone-0 text-stone-700 hover:bg-stone-100 hover:text-ink-700",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
