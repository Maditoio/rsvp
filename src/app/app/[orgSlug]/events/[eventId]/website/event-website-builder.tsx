"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  buildEventSiteRenderData,
  EventSiteRenderer,
} from "@/components/event-sites/event-site-renderer";
import type { EventWebsiteSettings } from "@/modules/event-sites/service";
import {
  saveEventWebsiteConfig,
  publishEventWebsite,
  unpublishEventWebsite,
  applyEventSiteTemplate,
} from "@/modules/event-sites/actions";
import { SectionEditorPanel } from "./builder/section-editor-panel";
import { SectionStrip } from "./builder/section-strip";
import { SetupPanel } from "./builder/setup-panel";
import { SeoPanel } from "./builder/seo-panel";
import { DomainPanel } from "./builder/domain-panel";
import { useBuilderState } from "./use-builder-state";
import { cn } from "@/lib/utils";
import { sortSections } from "@/modules/event-sites/sections";

type BuilderTab = "setup" | "design" | "seo" | "domain";

type Props = {
  orgSlug: string;
  eventId: string;
  orgName: string;
  settings: EventWebsiteSettings;
  publicUrl: string;
  applyUrl: string | null;
  sessions: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    dateLabel: string;
    timeLabel: string | null;
  }[];
  publicQrDataUrl: string | null;
};

const TABS: { id: BuilderTab; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "design", label: "Design" },
  { id: "seo", label: "SEO" },
  { id: "domain", label: "Domain" },
];

export function EventWebsiteBuilder({
  orgSlug,
  eventId,
  orgName,
  settings: initial,
  publicUrl,
  applyUrl,
  sessions,
  publicQrDataUrl,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [activeTab, setActiveTab] = useState<BuilderTab>("design");
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(true);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(
    initial.websitePublishedAt?.toISOString() ?? null,
  );

  const { config, setConfig, undo, redo, canUndo, canRedo, reset } =
    useBuilderState(initial.config);

  useEffect(() => {
    if (activeTab !== "design") return;
    const sections = sortSections(config.sections);
    if (sections.length === 0) {
      setSelectedSectionId(null);
      return;
    }
    if (!selectedSectionId || !sections.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(sections[0]?.id ?? null);
    }
  }, [activeTab, config.sections, selectedSectionId]);

  const agendaSection = config.sections.find((s) => s.type === "agenda");
  const maxSessions =
    typeof agendaSection?.content.maxSessions === "number"
      ? agendaSection.content.maxSessions
      : 8;

  const previewData = useMemo(
    () =>
      buildEventSiteRenderData({
        orgName,
        eventName: initial.event.name,
        venue: initial.event.venue,
        startsAt: initial.event.startsAt,
        endsAt: initial.event.endsAt,
        timezone: initial.event.timezone,
        logoUrl: initial.event.logoUrl,
        config,
        sessions: agendaSection?.enabled
          ? sessions.slice(0, maxSessions)
          : [],
        sponsorGroups: initial.sponsorGroups,
        applyUrl,
        allowPublicApplication: initial.event.allowPublicApplication,
        editorMode: true,
      }),
    [orgName, initial, config, sessions, applyUrl, agendaSection, maxSessions],
  );

  function saveDraft() {
    setSaveState("saving");
    start(async () => {
      const result = await saveEventWebsiteConfig(orgSlug, eventId, config);
      if (!result.ok) {
        toast.error(result.error);
        setSaveState("idle");
        return;
      }
      setSaveState("saved");
      toast.success("Draft saved.");
      router.refresh();
      setTimeout(() => setSaveState("idle"), 2000);
    });
  }

  function publish() {
    start(async () => {
      const draft = await saveEventWebsiteConfig(orgSlug, eventId, config);
      if (!draft.ok) {
        toast.error(draft.error);
        return;
      }
      const result = await publishEventWebsite(orgSlug, eventId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPublishedAt(result.data?.publishedAt ?? new Date().toISOString());
      setPublishConfirm(false);
      toast.success("Event website published.");
      router.refresh();
    });
  }

  function unpublish() {
    start(async () => {
      const result = await unpublishEventWebsite(orgSlug, eventId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPublishedAt(null);
      toast.success("Event website unpublished.");
      router.refresh();
    });
  }

  function applyTemplate(templateId: typeof config.templateId) {
    start(async () => {
      const result = await applyEventSiteTemplate(orgSlug, eventId, templateId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.data?.config) {
        reset(result.data.config);
      }
      toast.success("Template applied.");
      router.refresh();
    });
  }

  const isPublished = Boolean(publishedAt);

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/app/${orgSlug}/events/${eventId}`}
            className="inline-flex size-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Back to event"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              Event website
            </h1>
            <p className="truncate text-xs text-slate-500">{initial.event.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isPublished ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <span className={`size-1.5 rounded-full ${isPublished ? "bg-teal-500" : "bg-amber-500"}`} />
            {isPublished ? "Published" : "Draft"}
          </span>
          <span className="text-xs text-slate-400">
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
          </span>
          <Button type="button" variant="ghost" size="sm" disabled={!canUndo} onClick={undo} aria-label="Undo">
            <Undo2 className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={!canRedo} onClick={redo} aria-label="Redo">
            <Redo2 className="size-4" />
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={saveDraft}>
            Save
          </Button>
          <a
            href={`${publicUrl}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-full border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Preview
          </a>
          {isPublished ? (
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={unpublish}>
              Unpublish
            </Button>
          ) : null}
          <Button type="button" size="sm" disabled={pending} onClick={() => setPublishConfirm(true)}>
            {isPublished ? "Update live" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-slate-200 bg-white px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition",
              activeTab === tab.id
                ? "text-indigo-600"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {tab.label}
            {activeTab === tab.id ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600" />
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "setup" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SetupPanel
            config={config}
            onChange={setConfig}
            onApplyTemplate={applyTemplate}
            publicUrl={publicUrl}
            isPublished={isPublished}
            publishedAt={publishedAt}
            publicQrDataUrl={publicQrDataUrl}
            eventSlug={initial.event.slug}
            pending={pending}
          />
        </div>
      ) : null}

      {activeTab === "seo" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SeoPanel config={config} onChange={setConfig} />
        </div>
      ) : null}

      {activeTab === "domain" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DomainPanel orgSlug={orgSlug} eventId={eventId} customDomain={initial.customDomain} />
        </div>
      ) : null}

      {activeTab === "design" ? (
        <div className="flex min-h-0 flex-1 flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_340px]">
          <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-100">
            <SectionStrip
              config={config}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              onChange={setConfig}
            />
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
              <div className="flex items-center gap-1">
                {(
                  [
                    ["desktop", Monitor],
                    ["tablet", Tablet],
                    ["mobile", Smartphone],
                  ] as const
                ).map(([mode, Icon]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium capitalize ${
                      previewMode === mode
                        ? "bg-indigo-600 text-white"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                    onClick={() => setPreviewMode(mode)}
                  >
                    <Icon className="size-3.5" />
                    {mode}
                  </button>
                ))}
              </div>
              {!editorOpen ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditorOpen(true)}
                >
                  <PanelRightOpen className="size-3.5" />
                  Show editor
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="xl:hidden"
                  onClick={() => setEditorOpen(false)}
                >
                  <PanelRightClose className="size-3.5" />
                  Hide editor
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 xl:p-6">
              <Card className="mx-auto overflow-hidden p-0 shadow-sm">
                <EventSiteRenderer
                  data={previewData}
                  previewMode={previewMode}
                  selectedSectionId={selectedSectionId}
                  onSelectSection={setSelectedSectionId}
                />
              </Card>
            </div>
          </main>

          {editorOpen ? (
            <aside className="flex max-h-[45vh] min-h-0 flex-col border-t border-slate-200 bg-white xl:max-h-none xl:border-l xl:border-t-0">
              <div className="hidden shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 xl:flex">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Section editor
                </span>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                  aria-label="Hide editor panel"
                  onClick={() => setEditorOpen(false)}
                >
                  <PanelRightClose className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <SectionEditorPanel
                  orgSlug={orgSlug}
                  eventId={eventId}
                  config={config}
                  selectedSectionId={selectedSectionId}
                  onChange={setConfig}
                  allowPublicApplication={initial.event.allowPublicApplication}
                />
              </div>
            </aside>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={publishConfirm}
        onClose={() => setPublishConfirm(false)}
        title={isPublished ? "Update published site?" : "Publish event website?"}
        description={
          isPublished
            ? "Visitors will see your latest saved changes on the public URL."
            : "Your event website will be visible at the public URL. You can unpublish anytime."
        }
        confirmLabel={isPublished ? "Update live site" : "Publish now"}
        pending={pending}
        onConfirm={publish}
      />
    </div>
  );
}
