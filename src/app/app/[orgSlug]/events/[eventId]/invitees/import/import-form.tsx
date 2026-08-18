"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  commitContactImport,
  previewContactImport,
} from "@/modules/contacts/actions";
import type { ImportIssue, ImportRow } from "@/modules/contacts/parse";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function ContactImportForm({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <Card className="max-w-xl">
        <h1 className="font-display text-3xl text-gray-800">Import invitees</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload a CSV or Excel file with first name, last name and email. Duplicate
          emails already on this event are reported and skipped.
        </p>
        <form
          className="mt-6 space-y-4"
          action={(formData) => {
            setError(null);
            start(async () => {
              try {
                const result = await previewContactImport(orgSlug, eventId, formData);
                setPreview(result);
              } catch (e) {
                setPreview(null);
                setError(e instanceof Error ? e.message : "Could not preview import");
              }
            });
          }}
        >
          <div>
            <Label htmlFor="file">CSV or XLSX</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button disabled={pending}>
            {pending ? "Reading…" : "Preview import"}
          </Button>
        </form>
      </Card>

      {preview ? (
        <Card>
          <p className="text-sm text-gray-600">{preview.filename}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Count label="Rows" value={preview.uploaded} />
            <Count label="Valid" value={preview.valid} />
            <Count label="New" value={preview.createCount} />
            <Count label="Duplicates" value={preview.duplicateCount} />
          </div>
          <p className="mt-3 text-sm text-gray-600">
            {preview.issues.length} invalid row
            {preview.issues.length === 1 ? "" : "s"}
          </p>
          {preview.issues.length > 0 ? (
            <ul className="mt-3 max-h-40 overflow-auto text-sm text-gray-700">
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
              <p className="mb-2 font-medium text-gray-800">Will create</p>
              {preview.create.slice(0, 50).map((row) => (
                <p key={row.email} className="text-gray-700">
                  {row.firstName} {row.lastName} · {row.email}
                </p>
              ))}
              {preview.create.length > 50 ? (
                <p className="text-gray-500">
                  and {preview.create.length - 50} more
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-6 flex gap-2">
            <Button
              type="button"
              disabled={pending || preview.createCount === 0}
              onClick={() => {
                setError(null);
                start(async () => {
                  try {
                    await commitContactImport(orgSlug, eventId, preview.create);
                    router.push(`/app/${orgSlug}/events/${eventId}/invitees`);
                    router.refresh();
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Could not import contacts",
                    );
                  }
                });
              }}
            >
              {pending ? "Importing…" : `Import ${preview.createCount} contacts`}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreview(null)}
            >
              Choose another file
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-medium text-gray-800">{value}</p>
    </div>
  );
}
