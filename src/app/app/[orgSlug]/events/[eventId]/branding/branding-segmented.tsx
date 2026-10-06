"use client";

export function BrandingSegmented<T extends string>({
  value,
  options,
  disabled,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { id: T; label: string }[];
  disabled?: boolean;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-full bg-slate-100 p-1"
    >
      {options.map((opt) => {
        const selected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
              selected
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
