"use client";

import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  EVENT_SITE_CTA_TYPES,
  speakerDisplayName,
  type EventSiteConfig,
  type EventSiteSpeaker,
} from "@/modules/event-sites/config";
import {
  SECTION_TYPE_LABELS,
  updateSection,
  newDefaultSpeaker,
  type EventSiteSection,
} from "@/modules/event-sites/sections";
import { prepareImageForUpload } from "@/modules/files/prepare-image-upload";
import { uploadEventSiteImage } from "@/modules/event-sites/actions";
import {
  EVENT_SPONSOR_TIERS,
  EVENT_SPONSOR_TIER_LABELS,
  parseSponsorSectionTiers,
  type EventSponsorTierId,
} from "@/modules/sponsors/config";
import { useToast } from "@/components/ui/toast";
import { LayoutVariantPicker } from "./layout-variant-picker";
import type { EventSiteSectionType } from "@/modules/event-sites/sections";

type Props = {
  orgSlug: string;
  eventId: string;
  config: EventSiteConfig;
  selectedSectionId: string | null;
  onChange: (config: EventSiteConfig) => void;
  allowPublicApplication: boolean;
};

export function SectionEditorPanel({
  orgSlug,
  eventId,
  config,
  selectedSectionId,
  onChange,
  allowPublicApplication,
}: Props) {
  const toast = useToast();
  const heroInputRef = useRef<HTMLInputElement>(null);
  const speakerInputRef = useRef<HTMLInputElement>(null);
  const editingSpeakerIdRef = useRef<string | null>(null);

  const section = config.sections.find((s) => s.id === selectedSectionId) ?? null;

  function patchSection(id: string, patch: Parameters<typeof updateSection>[2]) {
    onChange({
      ...config,
      sections: updateSection(config.sections, id, patch),
    });
  }

  function patchContent(id: string, content: Record<string, unknown>) {
    patchSection(id, { content });
  }

  async function uploadImage(
    file: File,
    purpose: "hero" | "speaker" | "gallery" | "venue" | "og",
    onUrl: (url: string) => void,
  ) {
    const prepared = await prepareImageForUpload(
      file,
      purpose === "hero" || purpose === "venue" ? "background" : "logo",
    );
    if (!prepared.ok) {
      toast.error(prepared.error);
      return;
    }
    const formData = new FormData();
    formData.set("file", prepared.file);
    const result = await uploadEventSiteImage(orgSlug, eventId, formData, purpose);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.data?.url) onUrl(result.data.url);
    toast.success("Image uploaded.");
  }

  if (!section) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium text-slate-700">No section selected</p>
        <p className="mt-1 text-xs text-slate-500">
          Choose a section from the strip above the preview to edit its content.
        </p>
      </div>
    );
  }

  const title = SECTION_TYPE_LABELS[section.type as keyof typeof SECTION_TYPE_LABELS];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">Edit section content and layout.</p>
      </div>

      <div className="space-y-4 p-4">
        <LayoutVariantPicker
          sectionType={section.type as EventSiteSectionType}
          value={section.variant}
          onChange={(variant) => patchSection(section.id, { variant })}
        />

        {section.type === "hero" ? (
          <>
            <Field label="Eyebrow" value={String(section.content.eyebrow ?? "")} onChange={(v) => patchContent(section.id, { eyebrow: v })} />
            <Field label="Headline" value={String(section.content.headline ?? "")} onChange={(v) => patchContent(section.id, { headline: v })} />
            <TextArea label="Subheadline" value={String(section.content.subheadline ?? "")} onChange={(v) => patchContent(section.id, { subheadline: v })} />
            <Toggle label="Show dates" checked={section.content.showDates !== false} onChange={(v) => patchContent(section.id, { showDates: v })} />
            <Toggle label="Show venue" checked={section.content.showVenue !== false} onChange={(v) => patchContent(section.id, { showVenue: v })} />
            <Field label="Primary CTA label" value={String(section.content.primaryCtaLabel ?? "")} onChange={(v) => patchContent(section.id, { primaryCtaLabel: v })} />
            <div>
              <Label>Hero image</Label>
              <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file, "hero", (url) => patchContent(section.id, { imageUrl: url }));
                e.target.value = "";
              }} />
              <Button type="button" variant="secondary" size="sm" className="mt-1.5" onClick={() => heroInputRef.current?.click()}>
                Upload hero image
              </Button>
            </div>
          </>
        ) : null}

        {section.type === "about" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <TextArea label="Body" value={String(section.content.body ?? "")} onChange={(v) => patchContent(section.id, { body: v })} rows={6} />
          </>
        ) : null}

        {section.type === "speakers" ? (
          <SpeakersEditor
            section={section}
            onTitleChange={(title) => patchContent(section.id, { title })}
            onChange={(items) => patchContent(section.id, { items })}
            onUploadPhoto={(speakerId, file) => {
              editingSpeakerIdRef.current = speakerId;
              void uploadImage(file, "speaker", (url) => {
                const items = ((section.content.items as EventSiteSpeaker[]) ?? []).map((s) =>
                  s.id === speakerId ? { ...s, photoUrl: url } : s,
                );
                patchContent(section.id, { items });
              });
            }}
            speakerInputRef={speakerInputRef}
          />
        ) : null}

        {section.type === "agenda" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <Field label="Max sessions" value={String(section.content.maxSessions ?? 8)} onChange={(v) => patchContent(section.id, { maxSessions: Number(v) || 8 })} />
            <p className="text-xs text-slate-500">Agenda pulls from event sessions automatically.</p>
          </>
        ) : null}

        {section.type === "sponsors" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <SponsorTiersEditor
              value={section.content.showTiers}
              onChange={(showTiers) => patchContent(section.id, { showTiers })}
            />
            <p className="text-xs text-slate-500">
              Sponsor logos and tiers are managed on the{" "}
              <a
                href={`/app/${orgSlug}/events/${eventId}/sponsors`}
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                Sponsors
              </a>{" "}
              tab. This section shows them grouped by tier on the public site.
            </p>
          </>
        ) : null}

        {section.type === "registration-cta" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <TextArea label="Subtitle" value={String(section.content.subtitle ?? "")} onChange={(v) => patchContent(section.id, { subtitle: v })} />
            <div>
              <Label>CTA type</Label>
              <select
                className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
                value={String(section.content.ctaType ?? "public_apply")}
                onChange={(e) => patchContent(section.id, { ctaType: e.target.value })}
              >
                {EVENT_SITE_CTA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "public_apply" ? "Public apply" : t === "external" ? "External URL" : "Hidden"}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Button label" value={String(section.content.ctaLabel ?? "")} onChange={(v) => patchContent(section.id, { ctaLabel: v })} />
            {section.content.ctaType === "external" ? (
              <Field label="External URL" value={String(section.content.externalUrl ?? "")} onChange={(v) => patchContent(section.id, { externalUrl: v })} />
            ) : null}
            {!allowPublicApplication && section.content.ctaType === "public_apply" ? (
              <p className="text-xs text-amber-700">Enable public applications in event settings for the CTA to work.</p>
            ) : null}
          </>
        ) : null}

        {section.type === "statistics" ? (
          <StatisticsEditor section={section} onPatch={(content) => patchContent(section.id, content)} />
        ) : null}

        {section.type === "contact" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <Field label="Email" value={String(section.content.email ?? "")} onChange={(v) => patchContent(section.id, { email: v })} />
            <Field label="Phone" value={String(section.content.phone ?? "")} onChange={(v) => patchContent(section.id, { phone: v })} />
          </>
        ) : null}

        {section.type === "faq" ? (
          <FaqEditor section={section} onPatch={(content) => patchContent(section.id, content)} />
        ) : null}

        {section.type === "venue" ? (
          <>
            <Field label="Title" value={String(section.content.title ?? "")} onChange={(v) => patchContent(section.id, { title: v })} />
            <Field label="Address" value={String(section.content.address ?? "")} onChange={(v) => patchContent(section.id, { address: v })} />
            <TextArea label="Description" value={String(section.content.description ?? "")} onChange={(v) => patchContent(section.id, { description: v })} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        rows={rows}
        className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="size-4 rounded border-slate-300 text-indigo-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function SpeakersEditor({
  section,
  onTitleChange,
  onChange,
  onUploadPhoto,
  speakerInputRef,
}: {
  section: EventSiteSection;
  onTitleChange: (title: string) => void;
  onChange: (items: EventSiteSpeaker[]) => void;
  onUploadPhoto: (speakerId: string, file: File) => void;
  speakerInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const items = (section.content.items as EventSiteSpeaker[]) ?? [];
  const [drawerSpeaker, setDrawerSpeaker] = useState<EventSiteSpeaker | null>(null);

  function updateSpeaker(id: string, patch: Partial<EventSiteSpeaker>) {
    onChange(items.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <>
      <Field
        label="Section title"
        value={String(section.content.title ?? "")}
        onChange={onTitleChange}
      />
      <div className="space-y-2">
        {items.map((speaker) => (
          <div key={speaker.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-3">
              {speaker.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={speaker.photoUrl} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {speakerDisplayName(speaker).slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{speakerDisplayName(speaker)}</p>
                <p className="truncate text-xs text-slate-500">{speaker.jobTitle ?? "Speaker"}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDrawerSpeaker(speaker)}>
                Edit
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            const speaker = newDefaultSpeaker();
            onChange([...items, speaker]);
            setDrawerSpeaker(speaker);
          }}
        >
          Add speaker
        </Button>
      </div>

      <Drawer
        open={Boolean(drawerSpeaker)}
        onClose={() => setDrawerSpeaker(null)}
        title="Edit speaker"
        size="md"
      >
        {drawerSpeaker ? (
          <div className="space-y-4">
            <Field label="First name" value={drawerSpeaker.firstName} onChange={(v) => {
              updateSpeaker(drawerSpeaker.id, { firstName: v });
              setDrawerSpeaker({ ...drawerSpeaker, firstName: v });
            }} />
            <Field label="Last name" value={drawerSpeaker.lastName} onChange={(v) => {
              updateSpeaker(drawerSpeaker.id, { lastName: v });
              setDrawerSpeaker({ ...drawerSpeaker, lastName: v });
            }} />
            <Field label="Job title" value={drawerSpeaker.jobTitle ?? ""} onChange={(v) => {
              updateSpeaker(drawerSpeaker.id, { jobTitle: v });
              setDrawerSpeaker({ ...drawerSpeaker, jobTitle: v });
            }} />
            <Field label="Organization" value={drawerSpeaker.organization ?? ""} onChange={(v) => {
              updateSpeaker(drawerSpeaker.id, { organization: v });
              setDrawerSpeaker({ ...drawerSpeaker, organization: v });
            }} />
            <TextArea label="Bio" value={drawerSpeaker.bio ?? ""} onChange={(v) => {
              updateSpeaker(drawerSpeaker.id, { bio: v });
              setDrawerSpeaker({ ...drawerSpeaker, bio: v });
            }} />
            <div>
              <Label>Photo</Label>
              <input
                ref={speakerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && drawerSpeaker) onUploadPhoto(drawerSpeaker.id, file);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="secondary" size="sm" className="mt-1.5" onClick={() => speakerInputRef.current?.click()}>
                Upload photo
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(items.filter((s) => s.id !== drawerSpeaker.id));
                setDrawerSpeaker(null);
              }}
            >
              Remove speaker
            </Button>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

function StatisticsEditor({
  section,
  onPatch,
}: {
  section: EventSiteSection;
  onPatch: (content: Record<string, unknown>) => void;
}) {
  const items = (section.content.items as { value: string; label: string }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Title" value={String(section.content.title ?? "")} onChange={(title) => onPatch({ ...section.content, title })} />
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Value"
            value={item.value}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, value: e.target.value };
              onPatch({ ...section.content, items: next });
            }}
          />
          <Input
            placeholder="Label"
            value={item.label}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, label: e.target.value };
              onPatch({ ...section.content, items: next });
            }}
          />
        </div>
      ))}
    </div>
  );
}

function FaqEditor({
  section,
  onPatch,
}: {
  section: EventSiteSection;
  onPatch: (content: Record<string, unknown>) => void;
}) {
  const items = (section.content.items as { question: string; answer: string }[]) ?? [];
  return (
    <div className="space-y-3">
      <Field label="Title" value={String(section.content.title ?? "")} onChange={(title) => onPatch({ ...section.content, title })} />
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
          <Input
            placeholder="Question"
            value={item.question}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, question: e.target.value };
              onPatch({ ...section.content, items: next });
            }}
          />
          <textarea
            placeholder="Answer"
            rows={2}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={item.answer}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, answer: e.target.value };
              onPatch({ ...section.content, items: next });
            }}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() =>
          onPatch({
            ...section.content,
            items: [...items, { question: "New question", answer: "" }],
          })
        }
      >
        Add FAQ item
      </Button>
    </div>
  );
}

function SponsorTiersEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (tiers: EventSponsorTierId[]) => void;
}) {
  const selected = new Set(parseSponsorSectionTiers(value));

  function toggle(tier: EventSponsorTierId) {
    const next = new Set(selected);
    if (next.has(tier)) next.delete(tier);
    else next.add(tier);
    if (next.size === 0) return;
    onChange(
      EVENT_SPONSOR_TIERS.filter((tierId) => next.has(tierId)),
    );
  }

  return (
    <div>
      <Label>Tiers to show</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {EVENT_SPONSOR_TIERS.map((tier) => (
          <label
            key={tier}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <input
              type="checkbox"
              className="size-3.5 rounded border-slate-300 text-indigo-600"
              checked={selected.has(tier)}
              onChange={() => toggle(tier)}
            />
            {EVENT_SPONSOR_TIER_LABELS[tier]}
          </label>
        ))}
      </div>
    </div>
  );
}