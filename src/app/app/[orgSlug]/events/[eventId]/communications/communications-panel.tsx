"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendEventReminders } from "@/modules/events/settings";
import {
  saveCommunicationAutomation,
  runCommunicationAutomationNow,
} from "@/modules/communications/automation-actions";
import { saveEmailBranding } from "@/modules/communications/email-branding-actions";
import {
  EMAIL_ACCENT_SWATCHES,
  type EmailBranding,
} from "@/modules/communications/email-branding";
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
  branding,
  emailAccentColor,
  logoUrl,
}: {
  orgSlug: string;
  eventId: string;
  messages: MessageRow[];
  automations: AutomationRow[];
  automationsEnabled: boolean;
  canSend: boolean;
  branding: EmailBranding;
  emailAccentColor: string | null;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editAutomation, setEditAutomation] = useState<AutomationRow | null>(null);
  const [accent, setAccent] = useState(emailAccentColor ?? branding.accentColor);
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

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Email branding</h2>
        <p className="mt-1 text-sm text-slate-500">
          Invitation and reminder emails use your event logo and brand colour.
          The sender remains Bizcon RSVP.
        </p>

        <div className="mt-5 grid gap-6 md:grid-cols-[180px_1fr]">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
              Logo
            </p>
            {branding.logoUrl || logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoUrl ?? logoUrl ?? ""}
                alt="Event logo"
                className="mt-3 max-h-16 max-w-full object-contain"
              />
            ) : (
              <p className="mt-3 text-sm text-slate-600">No logo uploaded yet.</p>
            )}
            <Link
              href={`/app/${orgSlug}/events/${eventId}/settings?tab=badges`}
              className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Manage event logo
            </Link>
            {logoUrl && !branding.logoUrl ? (
              <p className="mt-2 text-xs text-amber-700">
                SVG logos are skipped in email. Upload a PNG or JPEG for email
                branding.
              </p>
            ) : null}
          </div>

          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              formData.set("emailAccentColor", accent);
              start(async () => {
                try {
                  await saveEmailBranding(orgSlug, eventId, formData);
                  setNotice("Email branding saved.");
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not save email branding",
                  );
                }
              });
            }}
          >
            <div>
              <Label htmlFor="emailAccentColor">Brand colour</Label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  id="emailAccentColor"
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value.toUpperCase())}
                  className="h-10 w-14 cursor-pointer rounded-md border border-slate-200 bg-white p-1"
                />
                <Input
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="max-w-[8rem] font-mono uppercase"
                  placeholder="#4F46E5"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {EMAIL_ACCENT_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.value}
                    type="button"
                    title={swatch.label}
                    onClick={() => setAccent(swatch.value)}
                    className="size-7 rounded-full border border-slate-200 shadow-sm"
                    style={{ backgroundColor: swatch.value }}
                    aria-label={swatch.label}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
                Preview
              </p>
              <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
                {branding.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logoUrl}
                    alt=""
                    className="mb-3 max-h-10 max-w-[140px] object-contain"
                  />
                ) : (
                  <p
                    className="mb-2 text-[11px] font-bold tracking-[0.02em]"
                    style={{ color: accent }}
                  >
                    Bizcon RSVP
                  </p>
                )}
                <p className="text-sm font-semibold text-slate-900">
                  You&apos;re invited
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex rounded-full px-4 py-2 text-xs font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  View invitation
                </button>
              </div>
            </div>

            {canSend ? (
              <div className="flex justify-end">
                <Button disabled={pending}>
                  {pending ? "Saving…" : "Save branding"}
                </Button>
              </div>
            ) : null}
          </form>
        </div>
      </section>

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
                                : `Automation queued ${result.queued} reminder${result.queued === 1 ? "" : "s"} for delivery.`,
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
                  `${result.queued} reminder${result.queued === 1 ? "" : "s"} queued for delivery.`,
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
