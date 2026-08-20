"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import {
  commitContactImport,
  inspectContactImport,
  previewContactImport,
} from "@/modules/contacts/actions";
import {
  IMPORT_FIELDS,
  type ColumnMap,
  type ImportFieldKey,
  type ImportIssue,
  type ImportRow,
  validateColumnMap,
} from "@/modules/contacts/parse";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Step = "prepare" | "map" | "preview";

type InspectResult = {
  filename: string;
  rowCount: number;
  headers: string[];
  suggestedMap: ColumnMap;
  samples: Record<string, string>[];
};

type Preview = {
  filename: string;
  uploaded: number;
  valid: number;
  createCount: number;
  duplicateCount: number;
  issues: ImportIssue[];
  create: ImportRow[];
  duplicates: ImportRow[];
};

const ISSUE_LABEL: Record<ImportIssue["reason"], string> = {
  invalid_email: "Invalid email",
  missing_name: "Missing name",
  missing_email: "Missing email",
  duplicate_in_file: "Duplicate in file",
};

const FIELD_OPTIONS: { value: ImportFieldKey; label: string }[] = [
  { value: "ignore", label: "— Ignore —" },
  ...IMPORT_FIELDS.map((f) => ({ value: f.key, label: f.label })),
];

export function ContactImportForm({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("prepare");
  const [file, setFile] = useState<File | null>(null);
  const [inspect, setInspect] = useState<InspectResult | null>(null);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const templateHref = `/app/${orgSlug}/events/${eventId}/invitees/import/template`;
  const inviteesHref = `/app/${orgSlug}/events/${eventId}/invitees`;

  const mapError = useMemo(
    () => (inspect ? validateColumnMap(columnMap) : null),
    [inspect, columnMap],
  );

  function updateMap(header: string, field: ImportFieldKey) {
    setColumnMap((prev) => {
      const next = { ...prev };
      // Clear other headers already mapped to this field (except ignore)
      if (field !== "ignore") {
        for (const [h, f] of Object.entries(next)) {
          if (h !== header && f === field) next[h] = "ignore";
        }
      }
      next[header] = field;
      return next;
    });
  }

  function onPickFile(selected: File | null) {
    setError(null);
    setPreview(null);
    setInspect(null);
    setFile(selected);
    if (!selected) return;

    const fd = new FormData();
    fd.set("file", selected);
    start(async () => {
      try {
        const result = await inspectContactImport(orgSlug, eventId, fd);
        setInspect(result);
        setColumnMap(result.suggestedMap);
        setStep("map");
      } catch (e) {
        setFile(null);
        setError(e instanceof Error ? e.message : "Could not read file");
      }
    });
  }

  function runPreview() {
    if (!file || mapError) return;
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("columnMap", JSON.stringify(columnMap));
    start(async () => {
      try {
        const result = await previewContactImport(orgSlug, eventId, fd);
        setPreview(result);
        setStep("preview");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not preview import");
      }
    });
  }

  function runCommit() {
    if (!preview || preview.createCount === 0) return;
    setError(null);
    start(async () => {
      try {
        await commitContactImport(orgSlug, eventId, preview.create);
        router.push(inviteesHref);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not import contacts");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href={inviteesHref}
          className="text-sm font-medium text-bronze-700 hover:text-bronze-800"
        >
          ← Back to invitees
        </Link>
        <h1 className="mt-4 font-display text-3xl text-ink-800">
          Import invitees
        </h1>
        <p className="mt-1 text-sm text-stone-700">
          Import a .xlsx or .csv file. You&apos;ll map columns before anything is
          saved.
        </p>
      </div>

      <StepIndicator step={step} />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {step === "prepare" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href={templateHref}
              className="rounded-md border border-stone-200 bg-stone-0 p-5 transition-colors hover:border-ink-400"
            >
              <div className="flex items-start justify-between gap-3">
                <FileSpreadsheet
                  className="size-8 text-moss-600"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <Badge tone="success">Recommended</Badge>
              </div>
              <p className="mt-4 font-semibold text-ink-800">
                Download spreadsheet template
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Format your data correctly before uploading.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-700">
                <Download className="size-3.5" aria-hidden />
                Download template
              </span>
            </a>

            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-stone-200 bg-stone-0 p-5 text-left transition-colors hover:border-ink-400 disabled:opacity-60"
            >
              <Upload
                className="size-8 text-bronze-600"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="mt-4 font-semibold text-ink-800">
                Import from spreadsheet
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Upload a .xlsx or .csv file with your invitees.
              </p>
              <span className="mt-4 inline-flex text-sm font-medium text-ink-700">
                {pending ? "Reading…" : "Choose file"}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="rounded-md border border-stone-200 bg-stone-0 p-5">
            <h2 className="font-semibold text-ink-800">Column requirements</h2>
            <p className="mt-1 text-sm text-stone-600">
              Your spreadsheet should include these column headers in the first
              row.
            </p>
            <div className="mt-4 divide-y divide-stone-100">
              {IMPORT_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between gap-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-ink-800">{field.label}</span>
                  <RequirementBadge requirement={field.requirement} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === "map" && inspect ? (
        <div className="space-y-6">
          <div className="rounded-md border border-stone-200 bg-stone-0 p-5">
            <p className="text-sm text-stone-600">
              <span className="font-medium text-ink-800">{inspect.filename}</span>
              {" · "}
              {inspect.rowCount} data row{inspect.rowCount === 1 ? "" : "s"}
            </p>
            <h2 className="mt-4 font-display text-xl text-ink-800">
              Map your columns
            </h2>
            <p className="mt-1 text-sm text-stone-700">
              Match each spreadsheet column to a Bizcon RSVP field. We guessed
              where we could.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                    <th className="pb-2 pr-3 font-semibold">Your column</th>
                    <th className="pb-2 pr-3 font-semibold">Sample</th>
                    <th className="pb-2 font-semibold">Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {inspect.headers.map((header) => (
                    <tr key={header} className="border-b border-stone-100">
                      <td className="py-3 pr-3 font-medium text-ink-800">
                        {header || "(empty)"}
                      </td>
                      <td className="max-w-[12rem] truncate py-3 pr-3 text-stone-600">
                        {inspect.samples[0]?.[header] || "—"}
                      </td>
                      <td className="py-3">
                        <select
                          className="h-9 w-full max-w-xs rounded-sm border border-stone-200 bg-stone-0 px-2 text-sm text-ink-800"
                          value={columnMap[header] ?? "ignore"}
                          onChange={(e) =>
                            updateMap(header, e.target.value as ImportFieldKey)
                          }
                        >
                          {FIELD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {mapError ? (
              <p className="mt-4 text-sm text-danger">{mapError}</p>
            ) : (
              <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-moss-600">
                <CheckCircle2 className="size-4" aria-hidden />
                Required fields are mapped
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending || !!mapError} onClick={runPreview}>
              {pending ? "Checking…" : "Continue to preview"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStep("prepare");
                setFile(null);
                setInspect(null);
                setColumnMap({});
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Choose another file
            </Button>
          </div>
        </div>
      ) : null}

      {step === "preview" && preview ? (
        <div className="space-y-6">
          <div className="rounded-md border border-stone-200 bg-stone-0 p-5">
            <p className="text-sm text-stone-600">{preview.filename}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Count label="Rows" value={preview.uploaded} />
              <Count label="Valid" value={preview.valid} />
              <Count label="New" value={preview.createCount} />
              <Count label="Duplicates" value={preview.duplicateCount} />
            </div>
            <p className="mt-3 text-sm text-stone-600">
              {preview.issues.length} invalid row
              {preview.issues.length === 1 ? "" : "s"}
            </p>
            {preview.issues.length > 0 ? (
              <ul className="mt-3 max-h-40 overflow-auto text-sm text-stone-700">
                {preview.issues.slice(0, 40).map((issue) => (
                  <li key={`${issue.line}-${issue.reason}`}>
                    Line {issue.line}
                    {issue.email ? ` · ${issue.email}` : ""} —{" "}
                    {ISSUE_LABEL[issue.reason]}
                  </li>
                ))}
              </ul>
            ) : null}
            {preview.create.length > 0 ? (
              <div className="mt-4 max-h-48 overflow-auto text-sm">
                <p className="mb-2 font-medium text-ink-800">Will create</p>
                {preview.create.slice(0, 50).map((row) => (
                  <p key={row.email} className="text-stone-700">
                    {row.firstName} {row.lastName} · {row.email}
                  </p>
                ))}
                {preview.create.length > 50 ? (
                  <p className="text-stone-500">
                    and {preview.create.length - 50} more
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || preview.createCount === 0}
              onClick={runCommit}
            >
              {pending
                ? "Importing…"
                : `Import ${preview.createCount} contact${preview.createCount === 1 ? "" : "s"}`}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStep("map")}>
              Back to mapping
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const items: { id: Step; label: string }[] = [
    { id: "prepare", label: "Prepare" },
    { id: "map", label: "Map columns" },
    { id: "preview", label: "Confirm" },
  ];
  const activeIndex = items.findIndex((i) => i.id === step);

  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {items.map((item, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={item.id} className="flex items-center gap-2">
            {index > 0 ? (
              <span className="hidden h-px w-6 bg-stone-200 sm:block" aria-hidden />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-2",
                active && "font-semibold text-ink-800",
                done && "text-moss-600",
                !active && !done && "text-stone-500",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  active && "bg-ink-700 text-white",
                  done && "bg-moss-100 text-moss-700",
                  !active && !done && "bg-stone-100 text-stone-500",
                )}
              >
                {done ? "✓" : index + 1}
              </span>
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function RequirementBadge({
  requirement,
}: {
  requirement: (typeof IMPORT_FIELDS)[number]["requirement"];
}) {
  if (requirement === "optional") {
    return <Badge tone="muted">Optional</Badge>;
  }
  if (requirement === "required") {
    return <Badge tone="warning">Required</Badge>;
  }
  if (requirement === "required_if_no_email") {
    return <Badge tone="warning">Required</Badge>;
  }
  return <Badge tone="warning">Required</Badge>;
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-medium tabular-nums text-ink-800">{value}</p>
    </div>
  );
}
