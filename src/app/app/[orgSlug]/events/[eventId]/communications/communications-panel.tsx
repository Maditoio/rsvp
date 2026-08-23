"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendEventReminders } from "@/modules/events/settings";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";

type MessageRow = {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  sentAt: string;
};

export function CommunicationsPanel({
  orgSlug,
  eventId,
  messages,
  canSend,
}: {
  orgSlug: string;
  eventId: string;
  messages: MessageRow[];
  canSend: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const columns: DataTableColumn<MessageRow>[] = [
    {
      id: "to",
      header: "To",
      width: "1.5fr",
      cell: (row) => row.toEmail,
    },
    {
      id: "subject",
      header: "Subject",
      width: "2fr",
      cell: (row) => row.subject,
    },
    {
      id: "status",
      header: "Status",
      width: "1fr",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "sent",
      header: "Sent",
      width: "1.2fr",
      cell: (row) => (
        <span className="whitespace-nowrap">{row.sentAt || "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Outreach"
        title="Communications"
        description="Remind people who have not accepted, or who accepted but have not registered."
        actions={
          canSend ? (
            <Button
              type="button"
              onClick={() => {
                setError(null);
                setNotice(null);
                setOpen(true);
              }}
            >
              Send reminders
            </Button>
          ) : null
        }
      />

      {notice ? <p className="text-sm text-success">{notice}</p> : null}

      {messages.length === 0 ? (
        <p className="text-sm text-slate-700">No messages have been sent yet.</p>
      ) : (
        <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
          <DataTable
            rows={messages}
            columns={columns}
            getRowId={(row) => row.id}
            searchPlaceholder="Search messages…"
            searchFilter={(row, query) => {
              const haystack = [row.toEmail, row.subject, row.status, row.sentAt]
                .join(" ")
                .toLowerCase();
              return haystack.includes(query);
            }}
            emptyMessage="No messages have been sent yet."
            showRowsPerPage
          />
        </Suspense>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Send reminders"
        description="Each reminder issues a new invitation link. Previous email links stop working."
      >
        <form
          className="space-y-4"
          action={(formData) => {
            setError(null);
            start(async () => {
              try {
                const result = await sendEventReminders(orgSlug, eventId, formData);
                setOpen(false);
                setNotice(
                  `Sent ${result.sent} reminder${result.sent === 1 ? "" : "s"}.`,
                );
                router.refresh();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not send reminders",
                );
              }
            });
          }}
        >
          <div>
            <Label htmlFor="audience">Audience</Label>
            <Select id="audience" name="audience" required>
              <option value="unaccepted">Invited, not yet accepted</option>
              <option value="unregistered">Accepted, not yet registered</option>
            </Select>
          </div>
          <p className="text-xs text-slate-500">
            Reminder links replace the previous invitation token. Anyone still
            holding an older email will need this new message.
          </p>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <Button disabled={pending}>
              {pending ? "Sending…" : "Send reminders"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
