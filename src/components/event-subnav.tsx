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
            "rounded-full px-3 py-1.5 text-sm",
            current === item.label
              ? "bg-slate-500 text-white"
              : "soon" in item && item.soon
                ? "bg-secondary-100 text-slate-400"
                : "bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
