import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "slate";
  size?: "sm" | "md";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "submit",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
        variant === "primary" && "bg-primary-600 text-white hover:bg-primary-500",
        variant === "secondary" &&
          "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50",
        variant === "ghost" && "bg-transparent text-white/80 hover:bg-white/10",
        variant === "danger" && "bg-error-500 text-white hover:opacity-90",
        variant === "slate" && "bg-slate-500 text-white hover:bg-slate-600",
        className,
      )}
      {...props}
    />
  );
}
