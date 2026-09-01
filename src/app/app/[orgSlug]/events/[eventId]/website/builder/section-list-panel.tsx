"use client";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SECTION_TYPE_LABELS,
  reorderSections,
  sortSections,
  createSection,
  EVENT_SITE_SECTION_TYPES,
  isSectionTypeAddable,
  sectionDisplayLabel,
  type EventSiteSection,
  type EventSiteSectionType,
} from "@/modules/event-sites/sections";
import type { EventSiteConfig } from "@/modules/event-sites/config";
import { cn } from "@/lib/utils";

type Props = {
  config: EventSiteConfig;
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onChange: (config: EventSiteConfig) => void;
};

export function SectionListPanel({
  config,
  selectedSectionId,
  onSelectSection,
  onChange,
}: Props) {
  const sections = sortSections(config.sections);

  function updateSections(next: EventSiteSection[]) {
    onChange({ ...config, sections: next });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    updateSections(reorderSections(config.sections, index, target));
  }

  function toggleSection(id: string) {
    updateSections(
      config.sections.map((s) =>
        s.id === id ? { ...s, enabled: !s.enabled } : s,
      ),
    );
  }

  function addSection(type: EventSiteSectionType) {
    const order = config.sections.length;
    const section = createSection(type, order);
    updateSections([...config.sections, section]);
    onSelectSection(section.id);
  }

  const addable = EVENT_SITE_SECTION_TYPES.filter((type) =>
    isSectionTypeAddable(type, sections),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Sections</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Reorder, show/hide, and select to edit.
        </p>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {sections.map((section, index) => (
          <li key={section.id}>
            <div
              className={cn(
                "flex items-center gap-1 rounded-lg border px-2 py-2 transition",
                selectedSectionId === section.id
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50",
              )}
            >
              <GripVertical className="size-4 shrink-0 text-slate-300" aria-hidden />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-800"
                onClick={() => onSelectSection(section.id)}
              >
                {sectionDisplayLabel(section)}
              </button>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                  aria-label="Move up"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                  aria-label="Move down"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === sections.length - 1}
                >
                  <ChevronDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                  aria-label={section.enabled ? "Hide section" : "Show section"}
                  onClick={() => toggleSection(section.id)}
                >
                  {section.enabled ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <EyeOff className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-200 p-3">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-indigo-600">
            <Plus className="size-4" />
            Add section
          </summary>
          <div className="mt-2 grid gap-1">
            {addable.map((type) => (
              <Button
                key={type}
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => addSection(type)}
              >
                {SECTION_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
