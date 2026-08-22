"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, Upload } from "lucide-react";
import {
  commitAgendaImport,
  previewAgendaImport,
  type SessionImportPreviewResult,
} from "@/modules/sessions/import-actions";
import { SESSION_TEMPLATE_HEADERS } from "@/modules/sessions/parse";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";

export function AgendaImport({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<SessionImportPreviewResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const templateHref = `/app/${orgSlug}/events/${eventId}/agenda/template`;

  function onPickFile(selected: File | null) {
    setError(null);
    setPreview(null);
    if (!selected) return;

    const fd = new FormData();
    fd.set("file", selected);
    start(async () => {
      const result = await previewAgendaImport(orgSlug, eventId, fd);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setPreview(result.data);
      setOpen(true);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={templateHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-stone-300 bg-stone-0 px-3 text-sm font-semibold text-ink-700 hover:bg-stone-50"
        >
          <Download className="size-3.5" aria-hidden />
          Download template
        </Link>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-3.5" aria-hidden />
          {pending ? "Reading…" : "Import CSV"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xls,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <Drawer
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Import agenda sessions"
        description="Review valid rows before adding them to the programme."
      >
        {preview ? (
          <div className="space-y-4">
            <p className="text-sm text-stone-700">
              <span className="font-medium text-ink-800">{preview.filename}</span>
              {" · "}
              {preview.uploaded} row{preview.uploaded === 1 ? "" : "s"} uploaded
            </p>

            <dl className="grid grid-cols-3 gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
              <div>
                <dt className="text-stone-500">Valid</dt>
                <dd className="font-mono font-semibold text-ink-800">
                  {preview.valid}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Issues</dt>
                <dd className="font-mono font-semibold text-ink-800">
                  {preview.issueCount}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Ready to import</dt>
                <dd className="font-mono font-semibold text-ink-800">
                  {preview.rows.length}
                </dd>
              </div>
            </dl>

            {preview.issues.length > 0 ? (
              <div className="rounded-md border border-stone-200 bg-stone-0">
                <p className="border-b border-stone-100 px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                  Rows with issues
                </p>
                <ul className="max-h-40 divide-y divide-stone-100 overflow-y-auto text-sm">
                  {preview.issues.slice(0, 20).map((issue) => (
                    <li key={`${issue.line}-${issue.reason}`} className="px-3 py-2">
                      <span className="font-mono text-stone-500">
                        Row {issue.line}
                      </span>
                      {issue.title ? (
                        <span className="text-stone-700"> · {issue.title}</span>
                      ) : null}
                      <span className="text-danger"> — {issue.message}</span>
                    </li>
                  ))}
                </ul>
                {preview.issues.length > 20 ? (
                  <p className="border-t border-stone-100 px-3 py-2 text-xs text-stone-500">
                    And {preview.issues.length - 20} more…
                  </p>
                ) : null}
              </div>
            ) : null}

            {preview.rows.length > 0 ? (
              <div className="rounded-md border border-stone-200 bg-stone-0">
                <p className="border-b border-stone-100 px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                  Preview (first {Math.min(preview.rows.length, 8)})
                </p>
                <ul className="divide-y divide-stone-100 text-sm">
                  {preview.rows.slice(0, 8).map((row) => (
                    <li key={row.line} className="px-3 py-2">
                      <p className="font-medium text-ink-800">{row.title}</p>
                      <p className="text-xs text-stone-500">
                        {row.startsAt?.toLocaleString("en-GB") ?? "No time"}
                        {row.endsAt
                          ? ` – ${row.endsAt.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                        {row.location ? ` · ${row.location}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-md border border-stone-200 bg-stone-0 p-3">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                Template columns
              </p>
              <p className="mt-1 text-xs text-stone-600">
                {SESSION_TEMPLATE_HEADERS.join(" · ")}
              </p>
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending || preview.rows.length === 0}
                onClick={() => {
                  setError(null);
                  start(async () => {
                    const result = await commitAgendaImport(
                      orgSlug,
                      eventId,
                      preview.rows,
                    );
                    if (!result.ok) {
                      setError(result.error);
                      toast.error(result.error);
                      return;
                    }
                    toast.success(
                      `${result.data.created} session${result.data.created === 1 ? "" : "s"} imported.`,
                    );
                    setOpen(false);
                    setPreview(null);
                    router.refresh();
                  });
                }}
              >
                {pending
                  ? "Importing…"
                  : `Import ${preview.rows.length} session${preview.rows.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-700">
            Upload a filled template to preview sessions before import.
          </p>
        )}
      </Drawer>
    </>
  );
}
