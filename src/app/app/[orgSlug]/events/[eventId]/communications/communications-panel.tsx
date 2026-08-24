"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendEventReminders } from "@/modules/events/settings";
import {
  saveCommunicationAutomation,
  runCommunicationAutomationNow,
} from "@/modules/communications/automation-actions";
import type { AutomationRow } from "@/modules/communications/automations";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { humanizeEnum } from "@/lib/utils";

type MessageRow = {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  sentAt: string;
};

function triggerLabel(trigger: AutomationRow["trigger"]) {
  switch (trigger) {
    case "INVITATION_NOT_ACCEPTED":
      return "Invitation not accepted";
    case "INVITATION_NOT_REGISTERED":
      return "Accepted, not registered";
    case "MEETING_ACCEPTED":
      return "Meeting accepted";
    case "EVENT_STARTS_BEFORE":
      return "Event starts soon";
    default:
      return humanizeEnum(trigger);
  }
}

export function CommunicationsPanel({
  orgSlug,
  eventId,
  messages,
  automations,
  automationsEnabled,
  canSend,
}: {
  orgSlug: string;
  eventId: string;
  messages: MessageRow[];
  automations: AutomationRow[];
  automationsEnabled: boolean;
  canSend: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editAutomation, setEditAutomation] = useState<AutomationRow | null>(null);
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Outreach"
        title="Communications"
        description="Manual reminders and rule-based automations for invitations and registrations."
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
      {!automationsEnabled ? (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          Communication automations are disabled in event settings. Manual
          reminders still work.
        </p>
      ) : null}

      <section className="rounded-xl bg-white shadow-sm p-5">
        <h2 className="font-display text-xl text-slate-900">Automations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Stored as data per event. A daily job evaluates enabled rules.
        </p>
        <div className="mt-4 space-y-3">
          {automations.map((automation) => (
            <div
              key={automation.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {automation.name ?? triggerLabel(automation.trigger)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  WHEN {triggerLabel(automation.trigger).toLowerCase()}
                  {automation.trigger.startsWith("EVENT")
                    ? ` · ${automation.delayDays} day(s) before`
                    : ` · AFTER ${automation.delayDays} day(s)`}{" "}
                  · DO {humanizeEnum(automation.action)}
                </p>
                {automation.lastRunAt ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Last run {new Date(automation.lastRunAt).toLocaleString("en-GB")}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={automation.enabled ? "ENABLED" : "DISABLED"}
                />
                {canSend ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        setEditAutomation(automation);
                        setError(null);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending || !automation.enabled}
                      onClick={() => {
                        setError(null);
                        start(async () => {
                          try {
                            const result = await runCommunicationAutomationNow(
                              orgSlug,
                              eventId,
                              automation.id,
                            );
                            setNotice(
                              result.skipped
                                ? "Automation skipped (disabled or gated)."
                                : `Automation sent ${result.sent} message${result.sent === 1 ? "" : "s"}.`,
                            );
                            router.refresh();
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Could not run automation",
                            );
                          }
                        });
                      }}
                    >
                      Run now
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl text-slate-900">Recent messages</h2>
        {messages.length === 0 ? (
          <p className="mt-2 text-sm text-slate-700">No messages have been sent yet.</p>
        ) : (
          <div className="mt-3">
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
          </div>
        )}
      </section>

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

      <Drawer
        open={editAutomation != null}
        onClose={() => setEditAutomation(null)}
        title="Edit automation"
        description={editAutomation ? triggerLabel(editAutomation.trigger) : undefined}
        size="sm"
      >
        {editAutomation ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              start(async () => {
                try {
                  formData.set("automationId", editAutomation.id);
                  await saveCommunicationAutomation(orgSlug, eventId, formData);
                  setEditAutomation(null);
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not save automation",
                  );
                }
              });
            }}
          >
            <input type="hidden" name="automationId" value={editAutomation.id} />
            <div>
              <Label htmlFor="automation-name">Name</Label>
              <Input
                id="automation-name"
                name="name"
                defaultValue={editAutomation.name ?? ""}
                placeholder={triggerLabel(editAutomation.trigger)}
              />
            </div>
            <div>
              <Label htmlFor="automation-delay">Delay (days)</Label>
              <Input
                id="automation-delay"
                name="delayDays"
                type="number"
                min={0}
                max={90}
                required
                defaultValue={editAutomation.delayDays}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <Checkbox
                name="enabled"
                value="on"
                defaultChecked={editAutomation.enabled}
              />
              Enabled
            </label>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end">
              <Button disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        ) : null}
      </Drawer>
    </div>
  );
}
