import type { LabelHTMLAttributes } from "react";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600"
      {...props}
    />
  );
}
