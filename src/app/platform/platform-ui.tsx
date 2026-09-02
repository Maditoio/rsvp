import { cn } from "@/lib/utils";

export function PlatformStatusTag({
  suspended,
  label,
  className,
}: {
  suspended: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        suspended
          ? "bg-rose-50 text-rose-700"
          : "bg-teal-50 text-teal-700",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          suspended ? "bg-rose-500" : "bg-teal-500",
        )}
        aria-hidden
      />
      {label ?? (suspended ? "Suspended" : "Active")}
    </span>
  );
}

export function formatPlatformDate(value: Date | null | undefined) {
  if (!value) return "—";
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPlatformDateTime(value: Date | null | undefined) {
  if (!value) return "—";
  return value.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
