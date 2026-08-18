import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
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
        "inline-flex items-center justify-center rounded-sm border border-transparent font-semibold transition-colors duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ink-700/12",
        "disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400 disabled:hover:border-stone-200 disabled:hover:bg-stone-100",
        size === "sm" && "h-8 px-3 text-[0.8125rem]",
        size === "md" && "h-11 px-5 text-[0.9375rem]",
        size === "lg" && "h-12 px-5 text-[0.9375rem]",
        variant === "primary" &&
          "bg-ink-700 text-white hover:bg-ink-800 active:bg-ink-900",
        variant === "secondary" &&
          "border-stone-300 bg-transparent text-ink-700 hover:border-ink-400 hover:bg-stone-50 active:bg-stone-100",
        variant === "ghost" &&
          "text-stone-700 hover:bg-stone-100 active:bg-stone-200",
        variant === "destructive" &&
          "bg-danger text-white hover:bg-[#73261f] active:bg-[#5d1f19]",
        className,
      )}
      {...props}
    />
  );
}
