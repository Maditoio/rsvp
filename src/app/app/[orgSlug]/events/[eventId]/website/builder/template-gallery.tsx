"use client";

import { cn } from "@/lib/utils";
import { listEventSiteTemplates, type EventSiteTemplateId } from "@/modules/event-sites/templates";

type Props = {
  selectedId: EventSiteTemplateId;
  onSelect: (id: EventSiteTemplateId) => void;
  compact?: boolean;
};

export function TemplateGallery({ selectedId, onSelect, compact }: Props) {
  const templates = listEventSiteTemplates();

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3")}>
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onSelect(template.id)}
          className={cn(
            "group overflow-hidden rounded-xl border text-left transition hover:shadow-md",
            selectedId === template.id
              ? "border-indigo-500 ring-2 ring-indigo-200"
              : "border-slate-200 hover:border-slate-300",
          )}
        >
          <div
            className={cn(
              "flex h-24 items-end bg-gradient-to-br p-4",
              template.previewGradient,
            )}
          >
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-wider",
                template.id === "modern-conference" ? "text-slate-700" : "text-white/90",
              )}
            >
              {template.label}
            </span>
          </div>
          <div className="space-y-1 p-3">
            <p className="text-sm font-semibold text-slate-900">{template.label}</p>
            <p className="line-clamp-2 text-xs text-slate-500">{template.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
