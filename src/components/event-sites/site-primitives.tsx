import Link from "next/link";
import { cn } from "@/lib/utils";
import type { EventSiteGlobalStyles } from "@/modules/event-sites/theme";
import { BORDER_RADIUS_CSS } from "@/modules/event-sites/theme";

type SiteButtonProps = {
  label: string;
  href: string;
  accent: string;
  style?: EventSiteGlobalStyles["buttonStyle"];
  radius?: EventSiteGlobalStyles["borderRadius"];
  className?: string;
  inverted?: boolean;
};

export function SiteButton({
  label,
  href,
  accent,
  style = "solid",
  radius = "full",
  className,
  inverted = false,
}: SiteButtonProps) {
  const r = BORDER_RADIUS_CSS[radius];

  const base =
    "inline-flex h-11 items-center justify-center px-6 text-sm font-semibold transition hover:-translate-y-px";

  let colors = "";
  if (style === "solid") {
    colors = inverted
      ? "bg-white text-slate-900 shadow-sm hover:bg-slate-50"
      : "text-white shadow-sm";
  } else if (style === "outline") {
    colors = inverted
      ? "border-2 border-white/80 text-white hover:bg-white/10"
      : "border-2 bg-transparent hover:bg-black/5";
  } else {
    colors = inverted
      ? "text-white/90 hover:bg-white/10"
      : "hover:bg-black/5";
  }

  return (
    <Link
      href={href}
      className={cn(base, colors, className)}
      style={{
        borderRadius: r,
        backgroundColor:
          style === "solid" && !inverted ? accent : undefined,
        borderColor: style === "outline" && !inverted ? accent : undefined,
        color: style === "outline" && !inverted ? accent : undefined,
      }}
    >
      {label}
    </Link>
  );
}

export function SiteContainer({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn("mx-auto w-full px-6 md:px-10", className)}
      style={{ maxWidth: "var(--site-container)" }}
    >
      {children}
    </div>
  );
}

export function SiteSection({
  children,
  className,
  id,
  selected,
  onSelect,
  editorMode,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  selected?: boolean;
  onSelect?: () => void;
  editorMode?: boolean;
}) {
  const inner = (
    <section
      id={id}
      className={cn(
        "py-[var(--site-section-py)]",
        editorMode && "relative cursor-pointer transition",
        editorMode && selected && "ring-2 ring-indigo-500 ring-inset",
        editorMode && !selected && "hover:ring-1 hover:ring-indigo-300 hover:ring-inset",
        className,
      )}
      style={{ scrollMarginTop: "4rem" }}
      onClick={editorMode ? onSelect : undefined}
      onKeyDown={
        editorMode
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onSelect?.();
            }
          : undefined
      }
      role={editorMode ? "button" : undefined}
      tabIndex={editorMode ? 0 : undefined}
    >
      {children}
    </section>
  );
  return inner;
}

export function SiteHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-semibold tracking-tight text-[var(--site-primary)]",
        Tag === "h1" && "text-4xl md:text-5xl lg:text-6xl",
        Tag === "h2" && "text-2xl md:text-3xl",
        Tag === "h3" && "text-lg md:text-xl",
        className,
      )}
      style={{ fontFamily: "var(--site-heading-font)" }}
    >
      {children}
    </Tag>
  );
}
