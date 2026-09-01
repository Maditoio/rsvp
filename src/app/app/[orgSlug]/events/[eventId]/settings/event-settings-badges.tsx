"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Upload, Trash2, ExternalLink } from "lucide-react";
import {
  updateBadgeSettings,
  uploadEventLogoAction,
  removeEventLogoAction,
  uploadSponsorLogoAction,
  uploadBadgeBackgroundAction,
  removeBadgeBackgroundAction,
} from "@/modules/badges/actions";
import { listBadgeTemplates, getBadgeTemplate } from "@/modules/badges/templates";
import {
  listBadgeDesigns,
  getBadgeDesign,
  type BadgeDesignId,
} from "@/modules/badges/designs";
import {
  BADGE_ELEMENT_LABELS,
  BADGE_FONT_IDS,
  BADGE_FONT_LABELS,
  getLayoutPreset,
  moveLayoutElement,
  qrColorsAreScannable,
  selectedSponsors as resolveSelectedSponsorLogos,
  serializeLayout,
  type BadgeBgFill,
  type BadgeCategoryStyle,
  type BadgeConfig,
  type BadgeElementId,
  type BadgeFontId,
  type BadgeLayout,
  type BadgeNameWeight,
  type BadgeTextAlign,
  type BadgeTextFill,
  type BadgeSponsor,
} from "@/modules/badges/config";
import { poseFromSnap, poseLeftEdge, snapElementPose } from "@/modules/badges/layout";
import {
  BADGE_PREVIEW_SAMPLE,
  type BadgePrintPayload,
} from "@/modules/badges/print-payload";
import { previewQrDataUrl } from "@/lib/qr";
import { BadgeCard } from "@/components/badges/badge-card";
import { BadgePreviewFrame } from "@/components/badges/badge-preview-frame";
import {
  BadgeFieldToggle,
  BadgeSettingsSection,
  BadgeSizeSlider,
} from "./badge-settings-controls";
import {
  BadgeColorField,
  BadgeFillControls,
  BadgeBackgroundControls,
} from "./badge-color-controls";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { friendlyUploadFailure } from "@/modules/files/image-upload";
import { prepareImageForUpload } from "@/modules/files/prepare-image-upload";

export function BadgeSettingsForm({
  orgSlug,
  eventId,
  eventName,
  logoUrl,
  previewQrDataUrl: initialPreviewQr,
  config,
  sponsorOptions,
}: {
  orgSlug: string;
  eventId: string;
  eventName: string;
  logoUrl: string | null;
  previewQrDataUrl: string;
  config: BadgeConfig;
  sponsorOptions: BadgeSponsor[];
}) {
  const router = useRouter();
  const toast = useToast();
  const eventLogoRef = useRef<HTMLInputElement>(null);
  const sponsorLogoRef = useRef<HTMLInputElement>(null);
  const badgeBgRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadAlert, setUploadAlert] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [sponsorName, setSponsorName] = useState("");
  const [draftLogoUrl, setDraftLogoUrl] = useState<string | null>(null);
  const [draftBgUrl, setDraftBgUrl] = useState<string | null>(null);
  const [liveQr, setLiveQr] = useState(initialPreviewQr);
  const [selectedElement, setSelectedElement] = useState<BadgeElementId | null>(
    null,
  );
  const [canvasMode, setCanvasMode] = useState<"design" | "print">("design");

  const [designId, setDesignId] = useState<BadgeDesignId>(config.designId);
  const [applyPreset, setApplyPreset] = useState(true);
  const [templateId, setTemplateId] = useState(config.templateId);
  const [layout, setLayout] = useState<BadgeLayout>(
    () => config.layout ?? getLayoutPreset(config.designId),
  );
  const [showEventLogo, setShowEventLogo] = useState(config.showEventLogo);
  const [showEventName, setShowEventName] = useState(config.showEventName);
  const [showCompany, setShowCompany] = useState(config.showCompany);
  const [showJobTitle, setShowJobTitle] = useState(config.showJobTitle);
  const [showCategory, setShowCategory] = useState(config.showCategory);
  const [showCountry, setShowCountry] = useState(config.showCountry);
  const [showQr, setShowQr] = useState(config.showQr);
  const [showSponsors, setShowSponsors] = useState(config.showSponsors);
  const [stackAttendeeFields, setStackAttendeeFields] = useState(
    config.stackAttendeeFields ?? true,
  );
  const [nameMaxLines, setNameMaxLines] = useState(config.nameMaxLines ?? 2);
  const [textAlign, setTextAlign] = useState<BadgeTextAlign>(config.textAlign);
  const [nameWeight, setNameWeight] = useState<BadgeNameWeight>(config.nameWeight);
  const [categoryStyle, setCategoryStyle] = useState<BadgeCategoryStyle>(
    config.categoryStyle,
  );
  const [nameSize, setNameSize] = useState(config.nameSize);
  const [companySize, setCompanySize] = useState(config.companySize);
  const [jobTitleSize, setJobTitleSize] = useState(config.jobTitleSize);
  const [categorySize, setCategorySize] = useState(config.categorySize);
  const [countrySize, setCountrySize] = useState(config.countrySize);
  const [eventNameSize, setEventNameSize] = useState(config.eventNameSize);
  const [eventLogoSize, setEventLogoSize] = useState(config.eventLogoSize);
  const [sponsorLogoSize, setSponsorLogoSize] = useState(config.sponsorLogoSize);
  const [qrPx, setQrPx] = useState(config.qrPx);
  const [contentGap, setContentGap] = useState(config.contentGap);
  const [padding, setPadding] = useState(config.padding);
  const [borderRadius, setBorderRadius] = useState(config.borderRadius);
  const [letterSpacing, setLetterSpacing] = useState(config.letterSpacing);
  const [nameFont, setNameFont] = useState<BadgeFontId>(config.nameFont ?? "inter");
  const [companyFont, setCompanyFont] = useState<BadgeFontId>(config.companyFont ?? "inter");
  const [jobTitleFont, setJobTitleFont] = useState<BadgeFontId>(config.jobTitleFont ?? "inter");
  const [categoryFont, setCategoryFont] = useState<BadgeFontId>(config.categoryFont ?? "inter");
  const [countryFont, setCountryFont] = useState<BadgeFontId>(config.countryFont ?? "inter");
  const [eventNameFont, setEventNameFont] = useState<BadgeFontId>(config.eventNameFont ?? "inter");
  const [nameColor, setNameColor] = useState(config.nameColor);
  const [companyColor, setCompanyColor] = useState(config.companyColor);
  const [jobTitleColor, setJobTitleColor] = useState(config.jobTitleColor);
  const [categoryColor, setCategoryColor] = useState(config.categoryColor);
  const [countryColor, setCountryColor] = useState(config.countryColor);
  const [eventNameColor, setEventNameColor] = useState(config.eventNameColor);
  const [nameFill, setNameFill] = useState<BadgeTextFill>(config.nameFill);
  const [nameGradientFrom, setNameGradientFrom] = useState(
    config.nameGradientFrom,
  );
  const [nameGradientTo, setNameGradientTo] = useState(config.nameGradientTo);
  const [nameGradientAngle, setNameGradientAngle] = useState(
    config.nameGradientAngle,
  );
  const [eventNameFill, setEventNameFill] = useState<BadgeTextFill>(
    config.eventNameFill,
  );
  const [eventNameGradientFrom, setEventNameGradientFrom] = useState(
    config.eventNameGradientFrom,
  );
  const [eventNameGradientTo, setEventNameGradientTo] = useState(
    config.eventNameGradientTo,
  );
  const [eventNameGradientAngle, setEventNameGradientAngle] = useState(
    config.eventNameGradientAngle,
  );
  const [qrDarkColor, setQrDarkColor] = useState(config.qrDarkColor);
  const [qrLightColor, setQrLightColor] = useState(config.qrLightColor);
  const [badgeBgFill, setBadgeBgFill] = useState<BadgeBgFill>(
    config.badgeBgFill,
  );
  const [badgeBgColor, setBadgeBgColor] = useState(config.badgeBgColor);
  const [badgeBgGradientFrom, setBadgeBgGradientFrom] = useState(
    config.badgeBgGradientFrom,
  );
  const [badgeBgGradientTo, setBadgeBgGradientTo] = useState(
    config.badgeBgGradientTo,
  );
  const [badgeBgGradientAngle, setBadgeBgGradientAngle] = useState(
    config.badgeBgGradientAngle,
  );
  const [selectedSponsors, setSelectedSponsors] = useState<Set<string>>(
    () => new Set(config.selectedSponsorIds),
  );

  const templates = listBadgeTemplates();
  const designs = listBadgeDesigns();
  const effectiveLogoUrl = draftLogoUrl ?? logoUrl;
  const effectiveBgUrl = draftBgUrl ?? (config.badgeBgImageUrl || null);
  const qrScannable = qrColorsAreScannable(qrDarkColor, qrLightColor);

  useEffect(() => {
    return () => {
      if (draftLogoUrl) URL.revokeObjectURL(draftLogoUrl);
    };
  }, [draftLogoUrl]);

  useEffect(() => {
    return () => {
      if (draftBgUrl) URL.revokeObjectURL(draftBgUrl);
    };
  }, [draftBgUrl]);

  useEffect(() => {
    let cancelled = false;
    void previewQrDataUrl("https://preview/badge", {
      dark: qrDarkColor,
      light: qrLightColor,
      width: Math.max(128, Math.min(1000, qrPx * 2)),
    }).then((url) => {
      if (!cancelled) setLiveQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [qrDarkColor, qrLightColor, qrPx]);

  const draftConfig = useMemo((): BadgeConfig => {
    return {
      ...config,
      templateId,
      designId,
      layout,
      showEventLogo,
      showEventName,
      showCompany,
      showJobTitle,
      showCategory,
      showCountry,
      showQr,
      showSponsors,
      stackAttendeeFields,
      nameMaxLines,
      textAlign,
      nameWeight,
      categoryStyle,
      nameFont,
      companyFont,
      jobTitleFont,
      categoryFont,
      countryFont,
      eventNameFont,
      nameSize,
      companySize,
      jobTitleSize,
      categorySize,
      countrySize,
      eventNameSize,
      eventLogoSize,
      sponsorLogoSize,
      qrPx,
      contentGap,
      padding,
      borderRadius,
      letterSpacing,
      nameColor,
      companyColor,
      jobTitleColor,
      categoryColor,
      countryColor,
      eventNameColor,
      nameFill,
      nameGradientFrom,
      nameGradientTo,
      nameGradientAngle,
      eventNameFill,
      eventNameGradientFrom,
      eventNameGradientTo,
      eventNameGradientAngle,
      qrDarkColor,
      qrLightColor,
      badgeBgFill,
      badgeBgColor,
      badgeBgGradientFrom,
      badgeBgGradientTo,
      badgeBgGradientAngle,
      badgeBgImageUrl: effectiveBgUrl ?? "",
      selectedSponsorIds: [...selectedSponsors],
    };
  }, [
    config,
    templateId,
    designId,
    layout,
    showEventLogo,
    showEventName,
    showCompany,
    showJobTitle,
    showCategory,
    showCountry,
    showQr,
    showSponsors,
    stackAttendeeFields,
    nameMaxLines,
    textAlign,
    nameWeight,
    categoryStyle,
    nameFont,
    companyFont,
    jobTitleFont,
    categoryFont,
    countryFont,
    eventNameFont,
    nameSize,
    companySize,
    jobTitleSize,
    categorySize,
    countrySize,
    eventNameSize,
    eventLogoSize,
    sponsorLogoSize,
    qrPx,
    contentGap,
    padding,
    borderRadius,
    letterSpacing,
    nameColor,
    companyColor,
    jobTitleColor,
    categoryColor,
    countryColor,
    eventNameColor,
    nameFill,
    nameGradientFrom,
    nameGradientTo,
    nameGradientAngle,
    eventNameFill,
    eventNameGradientFrom,
    eventNameGradientTo,
    eventNameGradientAngle,
    qrDarkColor,
    qrLightColor,
    badgeBgFill,
    badgeBgColor,
    badgeBgGradientFrom,
    badgeBgGradientTo,
    badgeBgGradientAngle,
    effectiveBgUrl,
    selectedSponsors,
  ]);

  const previewPayload = useMemo((): BadgePrintPayload => {
    return {
      ...BADGE_PREVIEW_SAMPLE,
      eventName,
      logoUrl: effectiveLogoUrl,
      sponsorLogos: resolveSelectedSponsorLogos(draftConfig, sponsorOptions),
      qrDataUrl: liveQr,
      config: draftConfig,
      template: getBadgeTemplate(templateId),
    };
  }, [draftConfig, eventName, effectiveLogoUrl, liveQr, templateId, sponsorOptions]);

  function selectDesign(id: BadgeDesignId) {
    setDesignId(id);
    if (!applyPreset) return;
    const design = getBadgeDesign(id);
    setLayout(getLayoutPreset(id));
    setQrPx(design.qrSize === "sm" ? 40 : design.qrSize === "lg" ? 64 : 56);
  }

  function toggleSponsor(id: string) {
    setSelectedSponsors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 8) next.add(id);
      return next;
    });
  }

  function saveSettings() {
    setError(null);
    const formData = new FormData();
    formData.set("templateId", templateId);
    formData.set("designId", designId);
    formData.set("layout", serializeLayout(layout));
    formData.set("textAlign", textAlign);
    formData.set("nameWeight", String(nameWeight));
    formData.set("categoryStyle", categoryStyle);
    formData.set("nameFont", nameFont);
    formData.set("companyFont", companyFont);
    formData.set("jobTitleFont", jobTitleFont);
    formData.set("categoryFont", categoryFont);
    formData.set("countryFont", countryFont);
    formData.set("eventNameFont", eventNameFont);
    formData.set("nameSize", String(nameSize));
    formData.set("companySize", String(companySize));
    formData.set("jobTitleSize", String(jobTitleSize));
    formData.set("categorySize", String(categorySize));
    formData.set("countrySize", String(countrySize));
    formData.set("eventNameSize", String(eventNameSize));
    formData.set("eventLogoSize", String(eventLogoSize));
    formData.set("sponsorLogoSize", String(sponsorLogoSize));
    formData.set("qrPx", String(qrPx));
    formData.set("contentGap", String(contentGap));
    formData.set("padding", String(padding));
    formData.set("borderRadius", String(borderRadius));
    formData.set("letterSpacing", String(letterSpacing));
    formData.set("nameColor", nameColor);
    formData.set("companyColor", companyColor);
    formData.set("jobTitleColor", jobTitleColor);
    formData.set("categoryColor", categoryColor);
    formData.set("countryColor", countryColor);
    formData.set("eventNameColor", eventNameColor);
    formData.set("nameFill", nameFill);
    formData.set("nameGradientFrom", nameGradientFrom);
    formData.set("nameGradientTo", nameGradientTo);
    formData.set("nameGradientAngle", String(nameGradientAngle));
    formData.set("eventNameFill", eventNameFill);
    formData.set("eventNameGradientFrom", eventNameGradientFrom);
    formData.set("eventNameGradientTo", eventNameGradientTo);
    formData.set("eventNameGradientAngle", String(eventNameGradientAngle));
    formData.set("qrDarkColor", qrDarkColor);
    formData.set("qrLightColor", qrLightColor);
    formData.set("badgeBgFill", badgeBgFill);
    formData.set("badgeBgColor", badgeBgColor);
    formData.set("badgeBgGradientFrom", badgeBgGradientFrom);
    formData.set("badgeBgGradientTo", badgeBgGradientTo);
    formData.set("badgeBgGradientAngle", String(badgeBgGradientAngle));
    if (showEventLogo) formData.set("showEventLogo", "on");
    if (showEventName) formData.set("showEventName", "on");
    if (showCompany) formData.set("showCompany", "on");
    if (showJobTitle) formData.set("showJobTitle", "on");
    if (showCategory) formData.set("showCategory", "on");
    if (showCountry) formData.set("showCountry", "on");
    if (showQr) formData.set("showQr", "on");
    if (showSponsors) formData.set("showSponsors", "on");
    if (stackAttendeeFields) formData.set("stackAttendeeFields", "on");
    formData.set("nameMaxLines", String(nameMaxLines));
    for (const id of selectedSponsors) {
      formData.append("selectedSponsorIds", id);
    }

    start(async () => {
      const result = await updateBadgeSettings(orgSlug, eventId, formData);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Badge settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
      <Card className="order-2 space-y-4 lg:order-1">
        <div>
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            Event day
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Badge design
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Drag elements on the live preview. Set a solid colour, gradient, or
            background image, then overlay text and logos — save to apply at the
            badge desk.
          </p>
        </div>

        <BadgeSettingsSection
          title="Printer & layout presets"
          description="Label size and starting arrangements — then drag to fine-tune"
          defaultOpen
        >
          <div>
            <Label htmlFor="templateId">Printer label size</Label>
            <Select
              id="templateId"
              value={templateId}
              onChange={(e) =>
                setTemplateId(e.target.value as BadgeConfig["templateId"])
              }
              className="mt-1.5"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.printerHint}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Design layout</Label>
            <div
              className="mt-3 grid gap-2 sm:grid-cols-2"
              role="listbox"
              aria-label="Design layout"
            >
              {designs.map((design) => (
                <button
                  key={design.id}
                  type="button"
                  role="option"
                  aria-selected={designId === design.id}
                  onClick={() => selectDesign(design.id)}
                  className={cn(
                    "rounded-xl p-3 text-left shadow-sm transition-colors",
                    designId === design.id
                      ? "bg-indigo-50 ring-2 ring-indigo-600"
                      : "bg-slate-50 hover:bg-white",
                  )}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {design.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {design.description}
                  </p>
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <Checkbox
                checked={applyPreset}
                onChange={(e) => setApplyPreset(e.target.checked)}
              />
              When I pick a layout, reset element positions on the canvas
            </label>
          </div>

          <div>
            <Label htmlFor="textAlign">Text alignment</Label>
            <Select
              id="textAlign"
              value={textAlign}
              onChange={(e) => setTextAlign(e.target.value as BadgeTextAlign)}
              className="mt-1.5"
            >
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </Select>
          </div>

          {selectedElement ? (
            <div className="space-y-2 rounded-xl bg-indigo-50 px-3 py-2">
              <p className="text-xs text-indigo-700">
                Selected:{" "}
                <strong>{BADGE_ELEMENT_LABELS[selectedElement]}</strong>
                {" · "}
                drag to move — snaps to centre
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const el = document.querySelector(
                    `[data-badge-el="${selectedElement}"]`,
                  ) as HTMLElement | null;
                  const parent = el?.offsetParent as HTMLElement | null;
                  const pose = layout[selectedElement];
                  let widthPct = 20;
                  let heightPct = 12;
                  if (el && parent) {
                    const er = el.getBoundingClientRect();
                    const pr = parent.getBoundingClientRect();
                    widthPct = (er.width / pr.width) * 100;
                    heightPct = (er.height / pr.height) * 100;
                  }
                  const snapped = snapElementPose(
                    poseLeftEdge(pose, widthPct),
                    pose.y,
                    widthPct,
                    heightPct,
                    100,
                  );
                  const next = poseFromSnap(snapped, widthPct);
                  setLayout((prev) =>
                    moveLayoutElement(
                      prev,
                      selectedElement,
                      next.x,
                      next.y,
                      next.anchorX,
                    ),
                  );
                }}
              >
                Snap to centre
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Click an element on the preview, then drag. Guides appear when it
              snaps to the badge centre.
            </p>
          )}
        </BadgeSettingsSection>

        <BadgeSettingsSection
          title="Colours & gradients"
          description="Background image, solid fill, or gradient — plus text colours"
        >
          <BadgeBackgroundControls
            fillId="badgeBgFill"
            fill={badgeBgFill}
            onFillChange={setBadgeBgFill}
            solidId="badgeBgColor"
            solidColor={badgeBgColor}
            onSolidChange={setBadgeBgColor}
            fromId="badgeBgGradientFrom"
            fromColor={badgeBgGradientFrom}
            onFromChange={setBadgeBgGradientFrom}
            toId="badgeBgGradientTo"
            toColor={badgeBgGradientTo}
            onToChange={setBadgeBgGradientTo}
            angleId="badgeBgGradientAngle"
            angle={badgeBgGradientAngle}
            onAngleChange={setBadgeBgGradientAngle}
            imageUrl={effectiveBgUrl}
            imageSlot={
              <div className="flex flex-wrap gap-2">
                <input
                  ref={badgeBgRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={() => {
                    const file = badgeBgRef.current?.files?.[0];
                    if (!file) return;
                    setError(null);
                    const objectUrl = URL.createObjectURL(file);
                    setDraftBgUrl((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return objectUrl;
                    });
                    setBadgeBgFill("image");
                    start(async () => {
                      const clearDraft = () => {
                        setDraftBgUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return null;
                        });
                        if (badgeBgRef.current) badgeBgRef.current.value = "";
                      };
                      try {
                        const prepared = await prepareImageForUpload(
                          file,
                          "background",
                        );
                        if (!prepared.ok) {
                          setUploadAlert(prepared.error);
                          clearDraft();
                          return;
                        }
                        const fd = new FormData();
                        fd.set("background", prepared.file);
                        const result = await uploadBadgeBackgroundAction(
                          orgSlug,
                          eventId,
                          fd,
                        );
                        if (!result.ok) {
                          setError(result.error);
                          setUploadAlert(result.error);
                          clearDraft();
                          return;
                        }
                        setBadgeBgFill("image");
                        clearDraft();
                        toast.success("Background image uploaded.");
                        router.refresh();
                      } catch (err) {
                        const message = friendlyUploadFailure(
                          err,
                          "background",
                          "Could not upload badge background.",
                        );
                        setError(message);
                        setUploadAlert(message);
                        clearDraft();
                      }
                    });
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leadingIcon={<Upload className="size-4" strokeWidth={1.75} />}
                  disabled={pending}
                  onClick={() => badgeBgRef.current?.click()}
                >
                  Upload background
                </Button>
                {effectiveBgUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      start(async () => {
                        const result = await removeBadgeBackgroundAction(
                          orgSlug,
                          eventId,
                        );
                        if (!result.ok) {
                          toast.error(result.error);
                          return;
                        }
                        setBadgeBgFill("solid");
                        setDraftBgUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return null;
                        });
                        toast.success("Background image removed.");
                        router.refresh();
                      });
                    }}
                  >
                    <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                    Remove
                  </Button>
                ) : null}
              </div>
            }
          />

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">
              Attendee name
            </p>
            <BadgeFillControls
              fillId="nameFill"
              fill={nameFill}
              onFillChange={setNameFill}
              solidId="nameColor"
              solidLabel="Name colour"
              solidColor={nameColor}
              onSolidChange={setNameColor}
              fromId="nameGradientFrom"
              fromColor={nameGradientFrom}
              onFromChange={setNameGradientFrom}
              toId="nameGradientTo"
              toColor={nameGradientTo}
              onToChange={setNameGradientTo}
              angleId="nameGradientAngle"
              angle={nameGradientAngle}
              onAngleChange={setNameGradientAngle}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">
              Event name
            </p>
            <BadgeFillControls
              fillId="eventNameFill"
              fill={eventNameFill}
              onFillChange={setEventNameFill}
              solidId="eventNameColor"
              solidLabel="Event name colour"
              solidColor={eventNameColor}
              onSolidChange={setEventNameColor}
              fromId="eventNameGradientFrom"
              fromColor={eventNameGradientFrom}
              onFromChange={setEventNameGradientFrom}
              toId="eventNameGradientTo"
              toColor={eventNameGradientTo}
              onToChange={setEventNameGradientTo}
              angleId="eventNameGradientAngle"
              angle={eventNameGradientAngle}
              onAngleChange={setEventNameGradientAngle}
            />
          </div>

          <BadgeColorField
            id="companyColor"
            label="Company colour"
            value={companyColor}
            onChange={setCompanyColor}
          />
          <BadgeColorField
            id="jobTitleColor"
            label="Job title colour"
            value={jobTitleColor}
            onChange={setJobTitleColor}
          />
          <BadgeColorField
            id="countryColor"
            label="Country colour"
            value={countryColor}
            onChange={setCountryColor}
          />
          <BadgeColorField
            id="categoryColor"
            label="Category colour (plain style)"
            value={categoryColor}
            onChange={setCategoryColor}
          />
        </BadgeSettingsSection>

        <BadgeSettingsSection
          title="Spacing & shape"
          description="Corner radius and letter-spacing"
        >
          <BadgeSizeSlider
            id="borderRadius"
            label="Corner radius"
            value={borderRadius}
            onChange={setBorderRadius}
          />
          <BadgeSizeSlider
            id="letterSpacing"
            label="Name letter-spacing"
            value={letterSpacing}
            onChange={setLetterSpacing}
          />
          <BadgeSizeSlider
            id="contentGap"
            label="Content gap (legacy)"
            value={contentGap}
            onChange={setContentGap}
          />
          <BadgeSizeSlider
            id="padding"
            label="Padding (legacy)"
            value={padding}
            onChange={setPadding}
          />
        </BadgeSettingsSection>

        <BadgeSettingsSection
          title="Logos"
          description="Upload logos and set pixel sizes"
        >
          <div>
            <Label>Event logo</Label>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {effectiveLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={effectiveLogoUrl}
                  alt="Event logo"
                  className="h-12 max-w-[160px] rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-12 w-32 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                  No logo
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={eventLogoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={() => {
                    const file = eventLogoRef.current?.files?.[0];
                    if (!file) return;
                    setError(null);
                    const objectUrl = URL.createObjectURL(file);
                    setDraftLogoUrl((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return objectUrl;
                    });
                    start(async () => {
                      const clearDraft = () => {
                        setDraftLogoUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return null;
                        });
                        if (eventLogoRef.current) eventLogoRef.current.value = "";
                      };
                      try {
                        const prepared = await prepareImageForUpload(file, "logo");
                        if (!prepared.ok) {
                          setUploadAlert(prepared.error);
                          clearDraft();
                          return;
                        }
                        const fd = new FormData();
                        fd.set("logo", prepared.file);
                        const result = await uploadEventLogoAction(
                          orgSlug,
                          eventId,
                          fd,
                        );
                        if (!result.ok) {
                          setError(result.error);
                          setUploadAlert(result.error);
                          clearDraft();
                          return;
                        }
                        setDraftLogoUrl(null);
                        if (eventLogoRef.current) eventLogoRef.current.value = "";
                        toast.success("Event logo uploaded.");
                        router.refresh();
                      } catch (err) {
                        const message = friendlyUploadFailure(
                          err,
                          "logo",
                          "Could not upload logo.",
                        );
                        setError(message);
                        setUploadAlert(message);
                        clearDraft();
                      }
                    });
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leadingIcon={<Upload className="size-4" strokeWidth={1.75} />}
                  disabled={pending}
                  onClick={() => eventLogoRef.current?.click()}
                >
                  Upload
                </Button>
                {effectiveLogoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      start(async () => {
                        const result = await removeEventLogoAction(
                          orgSlug,
                          eventId,
                        );
                        if (!result.ok) {
                          toast.error(result.error);
                          return;
                        }
                        setDraftLogoUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return null;
                        });
                        toast.success("Event logo removed.");
                        router.refresh();
                      });
                    }}
                  >
                    <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <BadgeFieldToggle
            label="Show event logo on badge"
            checked={showEventLogo}
            onChange={setShowEventLogo}
            sizeId="eventLogoSize"
            sizeLabel="Event logo size"
            sizeValue={eventLogoSize}
            onSizeChange={setEventLogoSize}
          />

          <div>
            <Label>Sponsor logos</Label>
            <p className="mt-1 text-xs text-slate-500">
              Select up to 8 sponsors with logos for the badge strip. Manage
              tiers and logos on the{" "}
              <Link
                href={`/app/${orgSlug}/events/${eventId}/sponsors`}
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                Sponsors
              </Link>{" "}
              tab.
            </p>
            {sponsorOptions.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {sponsorOptions.map((sponsor) => (
                  <li
                    key={sponsor.id}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <Checkbox
                        checked={selectedSponsors.has(sponsor.id)}
                        onChange={() => toggleSponsor(sponsor.id)}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sponsor.url}
                        alt={sponsor.name}
                        className="h-8 max-w-[80px] object-contain"
                      />
                      <span className="text-sm text-slate-700">
                        {sponsor.name}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No sponsor logos yet. Add sponsors below or on the Sponsors tab.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1">
                <Label htmlFor="sponsor-name">Quick add</Label>
                <Input
                  id="sponsor-name"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="Sponsor name"
                />
              </div>
              <input
                ref={sponsorLogoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={() => {
                  const file = sponsorLogoRef.current?.files?.[0];
                  if (!file) return;
                  start(async () => {
                    try {
                      const prepared = await prepareImageForUpload(file, "logo");
                      if (!prepared.ok) {
                        setUploadAlert(prepared.error);
                        if (sponsorLogoRef.current) {
                          sponsorLogoRef.current.value = "";
                        }
                        return;
                      }
                      const fd = new FormData();
                      fd.set("logo", prepared.file);
                      fd.set("name", sponsorName.trim() || "Sponsor");
                      const result = await uploadSponsorLogoAction(
                        orgSlug,
                        eventId,
                        fd,
                      );
                      if (!result.ok) {
                        setUploadAlert(result.error);
                        return;
                      }
                      setSponsorName("");
                      if (sponsorLogoRef.current) sponsorLogoRef.current.value = "";
                      toast.success("Sponsor added to event.");
                      router.refresh();
                    } catch (err) {
                      setUploadAlert(
                        friendlyUploadFailure(
                          err,
                          "logo",
                          "Could not upload sponsor logo.",
                        ),
                      );
                      if (sponsorLogoRef.current) {
                        sponsorLogoRef.current.value = "";
                      }
                    }
                  });
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leadingIcon={<Upload className="size-4" strokeWidth={1.75} />}
                disabled={pending || sponsorOptions.length >= 50}
                onClick={() => sponsorLogoRef.current?.click()}
              >
                Upload sponsor logo
              </Button>
            </div>
          </div>

          <BadgeFieldToggle
            label="Show sponsor logos"
            checked={showSponsors}
            onChange={setShowSponsors}
            sizeId="sponsorLogoSize"
            sizeLabel="Sponsor logo size"
            sizeValue={sponsorLogoSize}
            onSizeChange={setSponsorLogoSize}
          />
        </BadgeSettingsSection>

        <BadgeSettingsSection
          title="Attendee fields"
          description="Visibility, stacking, and text sizes"
        >
          <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <Checkbox
              checked={stackAttendeeFields}
              onChange={(e) => setStackAttendeeFields(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-slate-900">
                Stack name &amp; details
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Company, job title, and country sit under the name so long names
                push them down instead of covering them. Drag the name block to
                move the whole stack.
              </span>
            </span>
          </label>

          <div>
            <Label htmlFor="nameMaxLines">Name max lines</Label>
            <Select
              id="nameMaxLines"
              value={String(nameMaxLines)}
              onChange={(e) => setNameMaxLines(Number(e.target.value))}
              className="mt-1.5"
            >
              <option value="1">1 line (truncate)</option>
              <option value="2">2 lines (recommended)</option>
              <option value="3">3 lines</option>
            </Select>
          </div>

          <BadgeSizeSlider
            id="nameSize"
            label="Name text size"
            value={nameSize}
            onChange={setNameSize}
          />
          <div>
            <Label htmlFor="nameWeight">Name weight</Label>
            <Select
              id="nameWeight"
              value={String(nameWeight)}
              onChange={(e) =>
                setNameWeight(Number(e.target.value) as BadgeNameWeight)
              }
              className="mt-1.5"
            >
              <option value="400">Regular (400)</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semibold (600)</option>
              <option value="700">Bold (700)</option>
            </Select>
          </div>
          <BadgeFieldToggle
            label="Show company"
            checked={showCompany}
            onChange={setShowCompany}
            sizeId="companySize"
            sizeLabel="Company text size"
            sizeValue={companySize}
            onSizeChange={setCompanySize}
          />
          <BadgeFieldToggle
            label="Show job title"
            checked={showJobTitle}
            onChange={setShowJobTitle}
            sizeId="jobTitleSize"
            sizeLabel="Job title text size"
            sizeValue={jobTitleSize}
            onSizeChange={setJobTitleSize}
          />
          <BadgeFieldToggle
            label="Show invitation category"
            checked={showCategory}
            onChange={setShowCategory}
            sizeId="categorySize"
            sizeLabel="Category text size"
            sizeValue={categorySize}
            onSizeChange={setCategorySize}
          />
          {showCategory ? (
            <div className="space-y-3 rounded-xl bg-indigo-50/60 p-3">
              <p className="text-xs text-indigo-700">
                Preview shows a sample “Delegate” category. Drag the category
                pill on the canvas to place it — use Print preview to confirm
                the exact printed position. When snapped to the horizontal
                centre, the category stays centred even if the label text is
                longer on a printed badge.
              </p>
              <div>
                <Label htmlFor="categoryStyle">Category style</Label>
                <Select
                  id="categoryStyle"
                  value={categoryStyle}
                  onChange={(e) =>
                    setCategoryStyle(e.target.value as BadgeCategoryStyle)
                  }
                  className="mt-1.5"
                >
                  <option value="pill">Pill badge</option>
                  <option value="plain">Plain text</option>
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedElement("category");
                  const pose = layout.category;
                  const widthPct = 28;
                  const snapped = snapElementPose(
                    poseLeftEdge(pose, widthPct),
                    pose.y,
                    widthPct,
                    8,
                    100,
                  );
                  const next = poseFromSnap(snapped, widthPct);
                  setLayout((prev) =>
                    moveLayoutElement(
                      prev,
                      "category",
                      next.x,
                      next.y,
                      next.anchorX,
                    ),
                  );
                }}
              >
                Bring category into view
              </Button>
            </div>
          ) : null}
          <BadgeFieldToggle
            label="Show country"
            checked={showCountry}
            onChange={setShowCountry}
            sizeId="countrySize"
            sizeLabel="Country text size"
            sizeValue={countrySize}
            onSizeChange={setCountrySize}
          />
        </BadgeSettingsSection>

        <BadgeSettingsSection
          title="Fonts"
          description="Choose a typeface for each badge element"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="nameFont">Name</Label>
              <Select
                id="nameFont"
                value={nameFont}
                onChange={(e) => setNameFont(e.target.value as BadgeFontId)}
                className="mt-1.5"
              >
                {BADGE_FONT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {BADGE_FONT_LABELS[id]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="companyFont">Company</Label>
              <Select
                id="companyFont"
                value={companyFont}
                onChange={(e) => setCompanyFont(e.target.value as BadgeFontId)}
                className="mt-1.5"
              >
                {BADGE_FONT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {BADGE_FONT_LABELS[id]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="jobTitleFont">Job title</Label>
              <Select
                id="jobTitleFont"
                value={jobTitleFont}
                onChange={(e) => setJobTitleFont(e.target.value as BadgeFontId)}
                className="mt-1.5"
              >
                {BADGE_FONT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {BADGE_FONT_LABELS[id]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="categoryFont">Category</Label>
              <Select
                id="categoryFont"
                value={categoryFont}
                onChange={(e) => setCategoryFont(e.target.value as BadgeFontId)}
                className="mt-1.5"
              >
                {BADGE_FONT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {BADGE_FONT_LABELS[id]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="countryFont">Country</Label>
              <Select
                id="countryFont"
                value={countryFont}
                onChange={(e) => setCountryFont(e.target.value as BadgeFontId)}
                className="mt-1.5"
              >
                {BADGE_FONT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {BADGE_FONT_LABELS[id]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="eventNameFont">Event name</Label>
              <Select
                id="eventNameFont"
                value={eventNameFont}
                onChange={(e) => setEventNameFont(e.target.value as BadgeFontId)}
                className="mt-1.5"
              >
                {BADGE_FONT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {BADGE_FONT_LABELS[id]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </BadgeSettingsSection>

        <BadgeSettingsSection title="Event branding">
          <BadgeFieldToggle
            label="Show event name"
            checked={showEventName}
            onChange={setShowEventName}
            sizeId="eventNameSize"
            sizeLabel="Event name text size"
            sizeValue={eventNameSize}
            onSizeChange={setEventNameSize}
          />
        </BadgeSettingsSection>

        <BadgeSettingsSection
          title="QR code"
          description="Size and module colours — keep contrast high for scanning"
        >
          <BadgeFieldToggle
            label="Show QR code"
            checked={showQr}
            onChange={setShowQr}
            sizeId="qrPx"
            sizeLabel="QR size"
            sizeValue={qrPx}
            onSizeChange={setQrPx}
          />
          <BadgeColorField
            id="qrDarkColor"
            label="QR dark modules"
            value={qrDarkColor}
            onChange={setQrDarkColor}
          />
          <BadgeColorField
            id="qrLightColor"
            label="QR light background"
            value={qrLightColor}
            onChange={setQrLightColor}
          />
          {!qrScannable ? (
            <p className="text-sm text-amber-700">
              Low contrast — scanners may fail. Prefer dark modules on a light
              background (Aurora slate / indigo on white).
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Contrast looks scannable with the current colours.
            </p>
          )}
        </BadgeSettingsSection>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="button" disabled={pending} onClick={saveSettings}>
            {pending ? "Saving…" : "Save badge settings"}
          </Button>
          <Link
            href={`/app/${orgSlug}/events/${eventId}/badges`}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Open badge desk
            <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </Card>

      <ConfirmDialog
        open={Boolean(uploadAlert)}
        onClose={() => setUploadAlert(null)}
        title={
          uploadAlert && /too large/i.test(uploadAlert)
            ? "Image too large"
            : "Couldn't use this image"
        }
        description={
          uploadAlert ??
          "This image can't be uploaded. Please try a smaller PNG, JPEG, or WebP."
        }
        confirmLabel="Got it"
        hideCancel
        onConfirm={() => setUploadAlert(null)}
      />

      <aside className="order-1 lg:order-2 lg:sticky lg:top-6">
        <Card className="space-y-4 p-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">Live canvas</p>
            <p className="mt-1 text-xs text-slate-500">
              Drag any visible element. Selection ring uses indigo-600.
            </p>
          </div>

          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                canvasMode === "design"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
              onClick={() => setCanvasMode("design")}
            >
              Design
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                canvasMode === "print"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
              onClick={() => {
                setCanvasMode("print");
                setSelectedElement(null);
              }}
            >
              Print preview
            </button>
          </div>

          <div className="flex justify-center rounded-xl bg-slate-50 p-4">
            <BadgePreviewFrame template={previewPayload.template}>
              <BadgeCard
                badge={previewPayload}
                editable={canvasMode === "design"}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                onMoveElement={(id, x, y, anchorX) =>
                  setLayout((prev) => moveLayoutElement(prev, id, x, y, anchorX))
                }
              />
            </BadgePreviewFrame>
          </div>

          <p className="text-center text-xs text-slate-500">
            {previewPayload.template.name}
            <span aria-hidden="true"> · </span>
            {getBadgeDesign(designId).name}
          </p>
        </Card>
      </aside>
    </div>
  );
}
