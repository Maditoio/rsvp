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

function HubSpotMark({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#FF7A59"
        d="M18.164 7.87V5.095a2.186 2.186 0 0 0 1.267-1.978v-.066A2.187 2.187 0 0 0 17.25.87h-.066a2.187 2.187 0 0 0-2.186 2.181v.066c0 .855.485 1.594 1.199 1.95v2.81a5.85 5.85 0 0 0-2.785 1.326l-7.38-5.746a2.552 2.552 0 0 0 .1-.688A2.525 2.525 0 1 0 3.606 5.3c0 .47.13.91.356 1.29l7.23 5.63a5.83 5.83 0 0 0-.43 2.21c0 .86.187 1.676.52 2.41l-2.28 2.28a2.13 2.13 0 0 0-.68-.115 2.17 2.17 0 1 0 2.17 2.17c0-.24-.04-.47-.115-.68l2.24-2.24c.75.4 1.61.63 2.52.63a5.86 5.86 0 0 0 5.86-5.86c0-2.19-1.2-4.1-2.98-5.13zM17.184 15.8a3.49 3.49 0 1 1 0-6.98 3.49 3.49 0 0 1 0 6.98z"
      />
    </svg>
  );
}

function SalesforceMark({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#00A1E0"
        d="M10.04 5.34c.62-.66 1.5-1.08 2.48-1.08.7 0 1.35.23 1.88.61.7-.78 1.72-1.27 2.86-1.27 2.1 0 3.8 1.7 3.8 3.8 0 .2-.02.4-.05.59 1.1.5 1.86 1.6 1.86 2.88 0 1.74-1.41 3.15-3.15 3.15H8.3c-1.98 0-3.58-1.6-3.58-3.58 0-1.55 1-2.87 2.4-3.35.1-1.05.6-1.99 1.36-2.66.18-.16.38-.3.58-.41z"
      />
    </svg>
  );
}
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
  const hubspotHref = `/app/${orgSlug}/events/${eventId}/invitees/import/hubspot`;
  const salesforceHref = `/app/${orgSlug}/events/${eventId}/invitees/import/salesforce`;
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
          className="text-sm font-medium text-indigo-700 hover:text-indigo-800"
        >
          ← Back to invitees
        </Link>
        <h1 className="mt-4 font-display text-3xl text-slate-900">
          Import invitees
        </h1>
        <p className="mt-1 text-sm text-slate-700">
          Import from a spreadsheet or from your organisation&apos;s HubSpot or
          Salesforce account. Spreadsheet imports map columns before anything is
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
              className="rounded-xl bg-white shadow-sm p-5 transition-colors hover:border-indigo-400"
            >
              <div className="flex items-start justify-between gap-3">
                <FileSpreadsheet
                  className="size-8 text-success"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <Badge tone="success">Recommended</Badge>
              </div>
              <p className="mt-4 font-semibold text-slate-900">
                Download spreadsheet template
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Format your data correctly before uploading.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Download className="size-3.5" aria-hidden />
                Download template
              </span>
            </a>

            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-white shadow-sm p-5 text-left transition-colors hover:border-indigo-400 disabled:opacity-60"
            >
              <Upload
                className="size-8 text-indigo-600"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="mt-4 font-semibold text-slate-900">
                Import from spreadsheet
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Upload a .xlsx or .csv file with your invitees.
              </p>
              <span className="mt-4 inline-flex text-sm font-medium text-slate-700">
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

            <Link
              href={hubspotHref}
              className="rounded-xl bg-white shadow-sm p-5 transition-colors hover:border-indigo-400"
            >
              <HubSpotMark />
              <p className="mt-4 font-semibold text-slate-900">
                Import from HubSpot
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Select contacts from your connected organisation HubSpot
                account. Read-only — nothing is written back to HubSpot.
              </p>
              <span className="mt-4 inline-flex text-sm font-medium text-slate-700">
                Choose HubSpot contacts
              </span>
            </Link>

            <Link
              href={salesforceHref}
              className="rounded-xl bg-white shadow-sm p-5 transition-colors hover:border-indigo-400"
            >
              <SalesforceMark />
              <p className="mt-4 font-semibold text-slate-900">
                Import from Salesforce
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Select contacts from your connected organisation Salesforce
                account. Read-only — nothing is written back to Salesforce.
              </p>
              <span className="mt-4 inline-flex text-sm font-medium text-slate-700">
                Choose Salesforce contacts
              </span>
            </Link>
          </div>

          <div className="rounded-xl bg-white shadow-sm p-5">
            <h2 className="font-semibold text-slate-900">Column requirements</h2>
            <p className="mt-1 text-sm text-slate-600">
              Your spreadsheet should include these column headers in the first
              row.
            </p>
            <div className="mt-4 divide-y divide-slate-100">
              {IMPORT_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between gap-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-slate-900">{field.label}</span>
                  <RequirementBadge requirement={field.requirement} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === "map" && inspect ? (
        <div className="space-y-6">
          <div className="rounded-xl bg-white shadow-sm p-5">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{inspect.filename}</span>
              {" · "}
              {inspect.rowCount} data row{inspect.rowCount === 1 ? "" : "s"}
            </p>
            <h2 className="mt-4 font-display text-xl text-slate-900">
              Map your columns
            </h2>
            <p className="mt-1 text-sm text-slate-700">
              Match each spreadsheet column to a Bizcon RSVP field. We guessed
              where we could.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    <th className="pb-2 pr-3 font-semibold">Your column</th>
                    <th className="pb-2 pr-3 font-semibold">Sample</th>
                    <th className="pb-2 font-semibold">Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {inspect.headers.map((header) => (
                    <tr key={header} className="border-b border-slate-100">
                      <td className="py-3 pr-3 font-medium text-slate-900">
                        {header || "(empty)"}
                      </td>
                      <td className="max-w-[12rem] truncate py-3 pr-3 text-slate-600">
                        {inspect.samples[0]?.[header] || "—"}
                      </td>
                      <td className="py-3">
                        <select
                          className="h-9 w-full max-w-xs rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900"
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
              <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-success">
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
          <div className="rounded-xl bg-white shadow-sm p-5">
            <p className="text-sm text-slate-600">{preview.filename}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Count label="Rows" value={preview.uploaded} />
              <Count label="Valid" value={preview.valid} />
              <Count label="New" value={preview.createCount} />
              <Count label="Duplicates" value={preview.duplicateCount} />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {preview.issues.length} invalid row
              {preview.issues.length === 1 ? "" : "s"}
            </p>
            {preview.issues.length > 0 ? (
              <ul className="mt-3 max-h-40 overflow-auto text-sm text-slate-700">
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
                <p className="mb-2 font-medium text-slate-900">Will create</p>
                {preview.create.slice(0, 50).map((row) => (
                  <p key={row.email} className="text-slate-700">
                    {row.firstName} {row.lastName} · {row.email}
                  </p>
                ))}
                {preview.create.length > 50 ? (
                  <p className="text-slate-500">
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
              <span className="hidden h-px w-6 bg-slate-200 sm:block" aria-hidden />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-2",
                active && "font-semibold text-slate-900",
                done && "text-success",
                !active && !done && "text-slate-500",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  active && "bg-indigo-600 text-white",
                  done && "bg-emerald-50 text-success",
                  !active && !done && "bg-slate-100 text-slate-500",
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
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-medium tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
