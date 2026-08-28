"use client";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SECTION_TYPE_LABELS,
  reorderSections,
  sortSections,
  createSection,
  EVENT_SITE_SECTION_TYPES,
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

export function SectionStrip({
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

  const addable = EVENT_SITE_SECTION_TYPES.filter(
    (type) => !sections.some((s) => s.type === type && type !== "gallery"),
  );

  const selectedIndex = sections.findIndex((s) => s.id === selectedSectionId);
  const selected = selectedIndex >= 0 ? sections[selectedIndex] : null;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelectSection(section.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              selectedSectionId === section.id
                ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              !section.enabled && "opacity-50",
            )}
          >
            {!section.enabled ? <EyeOff className="size-3" /> : null}
            {SECTION_TYPE_LABELS[section.type as EventSiteSectionType]}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="Move section up"
            disabled={selectedIndex === 0}
            onClick={() => moveSection(selectedIndex, -1)}
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="Move section down"
            disabled={selectedIndex === sections.length - 1}
            onClick={() => moveSection(selectedIndex, 1)}
          >
            <ChevronDown className="size-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
            aria-label={selected.enabled ? "Hide section" : "Show section"}
            onClick={() => toggleSection(selected.id)}
          >
            {selected.enabled ? (
              <Eye className="size-3.5" />
            ) : (
              <EyeOff className="size-3.5" />
            )}
          </button>
        </div>
      ) : null}

      <details className="group relative shrink-0">
        <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50">
          <Plus className="size-3.5" />
          Add
        </summary>
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {addable.map((type) => (
            <Button
              key={type}
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => addSection(type)}
            >
              {SECTION_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </details>
    </div>
  );
}
