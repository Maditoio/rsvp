"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Upload } from "lucide-react";
import { createEventSponsorWithLogoAction } from "@/modules/sponsors/actions";
import {
  EVENT_SPONSOR_TIERS,
  EVENT_SPONSOR_TIER_LABELS,
  type EventSponsorTierId,
} from "@/modules/sponsors/config";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { prepareImageForUpload } from "@/modules/files/prepare-image-upload";
import {
  ALLOWED_EVENT_IMAGE_TYPES,
  friendlyUploadFailure,
} from "@/modules/files/image-upload";

const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

type UploadProgress = {
  total: number;
  completed: number;
  failed: number;
  current?: string;
};

type Props = {
  orgSlug: string;
  eventId: string;
  existingCount: number;
};

export function SponsorBulkUpload({ orgSlug, eventId, existingCount }: Props) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tier, setTier] = useState<EventSponsorTierId>("GOLD");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const remaining = Math.max(0, 50 - existingCount);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((file) => ALLOWED_EVENT_IMAGE_TYPES.has(file.type));
      if (images.length === 0) {
        toast.error("Use PNG, JPEG, WebP, or SVG logo files.");
        return;
      }

      if (remaining === 0) {
        toast.error("You can add up to 50 sponsors per event.");
        return;
      }

      const batch = images.slice(0, remaining);
      if (batch.length < images.length) {
        toast.error(
          `Only ${batch.length} of ${images.length} logos were added — the 50-sponsor limit was reached.`,
        );
      }

      setUploading(true);
      setProgress({ total: batch.length, completed: 0, failed: 0 });

      let completed = 0;
      let failed = 0;

      for (const file of batch) {
        setProgress({
          total: batch.length,
          completed,
          failed,
          current: file.name,
        });

        try {
          const prepared = await prepareImageForUpload(file, "logo");
          if (!prepared.ok) {
            failed++;
            toast.error(`${file.name}: ${prepared.error}`);
            continue;
          }

          const formData = new FormData();
          formData.set("tier", tier);
          formData.set("logo", prepared.file);
          formData.set("logoFilename", file.name);

          const result = await createEventSponsorWithLogoAction(
            orgSlug,
            eventId,
            formData,
          );

          if (!result.ok) {
            failed++;
            toast.error(`${file.name}: ${result.error}`);
            continue;
          }

          completed++;
        } catch (err) {
          failed++;
          toast.error(
            `${file.name}: ${friendlyUploadFailure(err, "logo", "Could not upload logo.")}`,
          );
        }
      }

      setProgress({
        total: batch.length,
        completed,
        failed,
      });
      setUploading(false);

      if (completed > 0) {
        toast.success(
          completed === 1
            ? "1 sponsor logo added."
            : `${completed} sponsor logos added.`,
        );
        router.refresh();
      }

      if (inputRef.current) inputRef.current.value = "";
    },
    [eventId, orgSlug, remaining, router, tier, toast],
  );

  function onFilesSelected(fileList: FileList | null) {
    if (!fileList?.length || uploading) return;
    void uploadFiles(Array.from(fileList));
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Add sponsor logos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose a tier, then drop one or many logo files. Names are inferred from
          filenames — you can rename sponsors later.
        </p>
      </div>

      <div>
        <Label htmlFor="bulk-sponsor-tier">Tier</Label>
        <Select
          id="bulk-sponsor-tier"
          value={tier}
          disabled={uploading}
          onChange={(e) => setTier(e.target.value as EventSponsorTierId)}
          className="mt-1.5"
        >
          {EVENT_SPONSOR_TIERS.map((tierId) => (
            <option key={tierId} value={tierId}>
              {EVENT_SPONSOR_TIER_LABELS[tierId]}
            </option>
          ))}
        </Select>
      </div>

      <div
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-disabled={uploading || remaining === 0}
        onKeyDown={(event) => {
          if (uploading || remaining === 0) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!uploading && remaining > 0) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading && remaining > 0) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (uploading || remaining === 0) return;
          onFilesSelected(event.dataTransfer.files);
        }}
        onClick={() => {
          if (!uploading && remaining > 0) inputRef.current?.click();
        }}
        className={[
          "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
          dragging
            ? "border-indigo-400 bg-indigo-50/60"
            : "border-slate-200 bg-slate-50/80 hover:border-indigo-300 hover:bg-indigo-50/40",
          uploading || remaining === 0 ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
      >
        <ImageUp className="size-8 text-indigo-600" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-medium text-slate-900">
            Drop sponsor logos here
          </p>
          <p className="mt-1 text-xs text-slate-500">
            PNG, JPEG, WebP, or SVG — multiple files at once
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-600 shadow-sm">
          <Upload className="size-3.5" strokeWidth={1.75} />
          Browse files
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        disabled={uploading || remaining === 0}
        onChange={(event) => onFilesSelected(event.target.files)}
      />

      {remaining < 50 ? (
        <p className="text-xs text-slate-400">
          {remaining === 0
            ? "Sponsor limit reached (50)."
            : `${remaining} slot${remaining === 1 ? "" : "s"} remaining.`}
        </p>
      ) : null}

      {progress ? (
        <p className="text-sm text-slate-600" aria-live="polite">
          {uploading
            ? `Uploading ${progress.completed + 1} of ${progress.total}${
                progress.current ? ` — ${progress.current}` : ""
              }…`
            : progress.failed > 0
              ? `Finished: ${progress.completed} added, ${progress.failed} failed.`
              : `Finished: ${progress.completed} added.`}
        </p>
      ) : null}
    </Card>
  );
}
