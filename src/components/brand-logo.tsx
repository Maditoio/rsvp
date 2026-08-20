import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  /** Show wordmark next to the mark */
  withWordmark?: boolean;
  wordmark?: string;
  /** Mark size in pixels */
  size?: number;
  className?: string;
  wordmarkClassName?: string;
  priority?: boolean;
};

export function BrandLogo({
  href = "/",
  withWordmark = true,
  wordmark = "Bizcon RSVP",
  size = 36,
  className,
  wordmarkClassName,
  priority = false,
}: BrandLogoProps) {
  const mark = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/brand/logo-192.png"
        alt=""
        width={size}
        height={size}
        className="rounded-sm"
        priority={priority}
      />
      {withWordmark ? (
        <span
          className={cn(
            "font-display text-xl font-semibold text-ink-800",
            wordmarkClassName,
          )}
        >
          {wordmark}
        </span>
      ) : (
        <span className="sr-only">{wordmark}</span>
      )}
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex items-center hover:opacity-90">
      {mark}
    </Link>
  );
}

/** Compact mark for collapsed rails / icon-only slots */
export function BrandMark({
  size = 34,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/logo-192.png"
      alt="Bizcon RSVP"
      width={size}
      height={size}
      className={cn("rounded-sm", className)}
      priority={priority}
    />
  );
}
