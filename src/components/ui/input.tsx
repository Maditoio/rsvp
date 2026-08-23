import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /** Aurora styling for native date/time pickers (icon chrome, light color-scheme). */
  inputVariant?: "default" | "datetime";
};

const baseClasses =
  "h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-[0.84375rem] leading-[1.55] text-slate-900 placeholder:text-slate-400 outline-none shadow-xs";
const focusClasses =
  "focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/12";
const disabledClasses =
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400";
const invalidClasses =
  "aria-invalid:border-danger aria-invalid:focus:border-danger aria-invalid:focus:ring-danger/12";
const temporalClasses =
  "pr-10 [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer";

export function Input({
  className,
  type,
  inputVariant,
  ...props
}: Props) {
  const isTemporal =
    inputVariant === "datetime" ||
    type === "datetime-local" ||
    type === "time" ||
    type === "date";

  const input = (
    <input
      type={type}
      className={cn(
        baseClasses,
        focusClasses,
        disabledClasses,
        invalidClasses,
        isTemporal && temporalClasses,
        className,
      )}
      {...props}
    />
  );

  if (!isTemporal) return input;

  const Icon = type === "time" ? Clock : Calendar;

  return (
    <div className="relative">
      {input}
      <Icon
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        strokeWidth={1.75}
        aria-hidden
      />
    </div>
  );
}
