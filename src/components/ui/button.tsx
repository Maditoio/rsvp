import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  /** Leading icon (Aurora: 15–16px, 6px gap). Prefer `leadingIcon="plus"` for Add/New actions. */
  leadingIcon?: "plus" | ReactNode;
};

/** Shared leading + for primary Add / New action buttons. */
export function ButtonPlusIcon({ className }: { className?: string } = {}) {
  return (
    <Plus
      className={cn("size-4 shrink-0", className)}
      strokeWidth={2}
      aria-hidden
    />
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "submit",
  leadingIcon,
  children,
  ...props
}: Props) {
  const icon =
    leadingIcon === "plus" ? (
      <ButtonPlusIcon />
    ) : leadingIcon ? (
      leadingIcon
    ) : null;

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border border-transparent font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30",
        "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:bg-slate-100",
        size === "sm" && "h-9 px-3.5 text-[0.8125rem]",
        size === "md" && "h-10 px-5 text-[0.84375rem]",
        size === "lg" && "h-[46px] px-6 text-[0.9375rem]",
        variant === "primary" &&
          "bg-indigo-600 text-white shadow-accent hover:-translate-y-px hover:bg-indigo-700 active:translate-y-0 active:bg-indigo-800",
        variant === "secondary" &&
          "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100",
        variant === "ghost" &&
          "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
        variant === "destructive" &&
          "bg-danger text-white hover:bg-[#B91C1C] active:bg-[#991B1B]",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
