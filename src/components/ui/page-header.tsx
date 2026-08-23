import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function PageEyebrow({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-label text-indigo-600", className)}
      {...props}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  titleAs = "h1",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleAs?: "h1" | "h2";
}) {
  const TitleTag = titleAs;
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div>
        {eyebrow ? <PageEyebrow className="mb-2">{eyebrow}</PageEyebrow> : null}
        <TitleTag className="text-display text-slate-900">{title}</TitleTag>
        {description ? (
          <p className="mt-1 text-body text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
