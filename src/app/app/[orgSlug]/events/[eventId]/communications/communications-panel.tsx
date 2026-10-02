"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendEventReminders } from "@/modules/events/settings";
import {
  saveCommunicationAutomation,
  runCommunicationAutomationNow,
} from "@/modules/communications/automation-actions";
import { sendPostEventFollowUp } from "@/modules/communications/post-event-actions";
import type { AutomationRow } from "@/modules/communications/automations";
import { audienceLabel } from "@/modules/communications/post-event";
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
import { Textarea } from "@/components/ui/textarea";
import { humanizeEnum } from "@/lib/utils";

type MessageRow = {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  sentAt: string;
};

type CategoryOption = { id: string; name: string };
type PollOption = { id: string; title: string };

type PostEventCampaignRow = {
  id: string;
  name: string;
  subject: string;
  audience: "CHECKED_IN" | "REGISTERED" | "REGISTERED_NOT_CHECKED_IN" | null;
  status: string;
  queuedCount: number;
  skippedCount: number;
  sentAt: string;
  createdAt: string;
};

type DrawerKind = "reminders" | "post-event" | "automation" | null;

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
  eventName,
  messages,
  automations,
  automationsEnabled,
  canSend,
  eventEnded,
  defaultPostEventSubject,
  categories,
  polls,
  postEventCampaigns,
}: {
  orgSlug: string;
  eventId: string;
  eventName: string;
  messages: MessageRow[];
  automations: AutomationRow[];
  automationsEnabled: boolean;
  canSend: boolean;
  eventEnded: boolean;
  defaultPostEventSubject: string;
  categories: CategoryOption[];
  polls: PollOption[];
  postEventCampaigns: PostEventCampaignRow[];
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [editAutomation, setEditAutomation] = useState<AutomationRow | null>(
    null,
  );
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

  const campaignColumns: DataTableColumn<PostEventCampaignRow>[] = [
    {
      id: "subject",
      header: "Subject",
      width: "2fr",
      cell: (row) => row.subject || row.name,
    },
    {
      id: "audience",
      header: "Audience",
      width: "1.2fr",
      cell: (row) =>
        row.audience ? audienceLabel(row.audience) : "—",
    },
    {
      id: "queued",
      header: "Queued",
      width: "0.8fr",
      cell: (row) => String(row.queuedCount),
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
        <span className="whitespace-nowrap">
          {row.sentAt || row.createdAt || "—"}
        </span>
      ),
    },
  ];

  function openDrawer(kind: Exclude<DrawerKind, null | "automation">) {
    setError(null);
    setNotice(null);
    setEditAutomation(null);
    setDrawer(kind);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Outreach"
        title="Communications"
        description="Reminders, automations, and post-event follow-up for attendees."
        actions={
          canSend ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => openDrawer("reminders")}
              >
                Send reminders
              </Button>
              <Button type="button" onClick={() => openDrawer("post-event")}>
                Post-event email
              </Button>
            </div>
          ) : null
        }
      />

      {notice ? <p className="text-sm text-success">{notice}</p> : null}
      {!automationsEnabled ? (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          Communication automations are disabled in event settings. Manual
          reminders and post-event email still work.
        </p>
      ) : null}

      <p className="text-sm text-slate-500">
        Email logo, banner, and colour live under{" "}
        <Link
          href={`/app/${orgSlug}/events/${eventId}/branding`}
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Branding
        </Link>
        .
      </p>

      <section className="rounded-xl bg-white shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-slate-900">
              Post-event follow-up
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Thank attendees after the event ends. Optional category filter and
              poll link.
            </p>
          </div>
          {!eventEnded ? (
            <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Available after event end
            </p>
          ) : null}
        </div>
        {postEventCampaigns.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            No post-event emails have been sent yet.
          </p>
        ) : (
          <div className="mt-4">
            <Suspense
              fallback={<div className="h-32 rounded-xl bg-slate-50" />}
            >
              <DataTable
                rows={postEventCampaigns}
                columns={campaignColumns}
                getRowId={(row) => row.id}
                searchPlaceholder="Search follow-ups…"
                searchFilter={(row, query) => {
                  const haystack = [
                    row.subject,
                    row.name,
                    row.audience ?? "",
                    row.status,
                    row.sentAt,
                  ]
                    .join(" ")
                    .toLowerCase();
                  return haystack.includes(query);
                }}
                emptyMessage="No post-event emails have been sent yet."
                showRowsPerPage
              />
            </Suspense>
          </div>
        )}
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
                    Last run{" "}
                    {new Date(automation.lastRunAt).toLocaleString("en-GB")}
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
                        setDrawer(null);
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
          <p className="mt-2 text-sm text-slate-700">
            No messages have been sent yet.
          </p>
        ) : (
          <div className="mt-3">
            <Suspense
              fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}
            >
              <DataTable
                rows={messages}
                columns={columns}
                getRowId={(row) => row.id}
                searchPlaceholder="Search messages…"
                searchFilter={(row, query) => {
                  const haystack = [
                    row.toEmail,
                    row.subject,
                    row.status,
                    row.sentAt,
                  ]
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
        open={drawer === "reminders"}
        onClose={() => setDrawer(null)}
        title="Send reminders"
        description="Each reminder issues a new invitation link. Previous email links stop working."
      >
        <form
          className="space-y-4"
          action={(formData) => {
            setError(null);
            start(async () => {
              try {
                const result = await sendEventReminders(
                  orgSlug,
                  eventId,
                  formData,
                );
                setDrawer(null);
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
        open={drawer === "post-event"}
        onClose={() => setDrawer(null)}
        title="Post-event email"
        description={`Send a follow-up to attendees of ${eventName} after the event ends.`}
        size="lg"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            setError(null);
            start(async () => {
              try {
                const result = await sendPostEventFollowUp(
                  orgSlug,
                  eventId,
                  formData,
                );
                setDrawer(null);
                setNotice(
                  result.queued === 0
                    ? `No recipients to email${result.skipped ? ` (${result.skipped} skipped)` : ""}.`
                    : `Queued ${result.queued} post-event email${result.queued === 1 ? "" : "s"}${result.skipped ? ` (${result.skipped} skipped)` : ""}.`,
                );
                router.refresh();
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Could not send post-event email",
                );
              }
            });
          }}
        >
          {!eventEnded ? (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
              Sending is available after the event end date.
            </p>
          ) : null}
          <div>
            <Label htmlFor="post-event-audience">Audience</Label>
            <Select
              id="post-event-audience"
              name="audience"
              required
              defaultValue="checked_in"
            >
              <option value="checked_in">Checked in</option>
              <option value="registered">All registered (incl. checked in)</option>
              <option value="registered_not_checked_in">
                Registered, not checked in
              </option>
            </Select>
          </div>
          {categories.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-900">
                Categories (optional)
              </legend>
              <p className="text-xs text-slate-500">
                Leave unchecked to include every category.
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <Checkbox name="categoryIds" value={category.id} />
                    {category.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div>
            <Label htmlFor="post-event-subject">Subject</Label>
            <Input
              id="post-event-subject"
              name="subject"
              required
              maxLength={180}
              defaultValue={defaultPostEventSubject}
            />
          </div>
          <div>
            <Label htmlFor="post-event-body">Message</Label>
            <Textarea
              id="post-event-body"
              name="body"
              required
              maxLength={8000}
              rows={8}
              placeholder="Thank attendees, share next steps, or invite feedback. Plain text only — HTML is escaped."
            />
          </div>
          {polls.length > 0 ? (
            <div>
              <Label htmlFor="post-event-poll">Feedback poll (optional)</Label>
              <Select id="post-event-poll" name="pollId" defaultValue="">
                <option value="">Event app home</option>
                {polls.map((poll) => (
                  <option key={poll.id} value={poll.id}>
                    {poll.title}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <p className="text-xs text-slate-500">
            Unsubscribed recipients are skipped. Duplicate sends to the same
            address with the same subject are suppressed for 24 hours.
          </p>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <Button disabled={pending || !eventEnded}>
              {pending ? "Sending…" : "Send follow-up"}
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={editAutomation != null}
        onClose={() => setEditAutomation(null)}
        title="Edit automation"
        description={
          editAutomation ? triggerLabel(editAutomation.trigger) : undefined
        }
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
