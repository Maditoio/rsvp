"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateOperationsConfig } from "@/modules/meetings/operations-actions";
import type { EventOperationsConfig } from "@/modules/events/operations-config";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EventOperationsSettingsForm({
  orgSlug,
  eventId,
  config,
  categories,
  polls,
}: {
  orgSlug: string;
  eventId: string;
  config: EventOperationsConfig;
  categories: { id: string; name: string }[];
  polls: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const autoAcceptIds = new Set(
    config.categoryRules.filter((r) => r.autoAcceptRequests).map((r) => r.categoryId),
  );

  return (
    <div className="max-w-xl space-y-4 rounded-xl bg-white p-6 shadow-sm">
      <div>
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Matchmaking & automation
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Operations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Moderation, category rules, caps, batch triggers, and meeting
          reminders.
        </p>
      </div>
      <form
        className="space-y-4"
        action={(formData) => {
          setError(null);
          const categoryRules = categories.map((cat) => ({
            categoryId: cat.id,
            autoAcceptRequests: formData.get(`autoAccept_${cat.id}`) === "on",
          }));
          formData.set("categoryRulesJson", JSON.stringify(categoryRules));
          const capsRaw = String(formData.get("meetingCapsJson") ?? "").trim();
          if (!capsRaw) formData.set("meetingCapsJson", "[]");
          start(async () => {
            try {
              await updateOperationsConfig(orgSlug, eventId, formData);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not save");
            }
          });
        }}
      >
        <label className="flex items-start gap-3 text-body text-slate-700">
          <Checkbox
            name="requestModerationEnabled"
            value="on"
            defaultChecked={config.requestModerationEnabled}
            className="mt-0.5"
          />
          <span>
            <span className="font-semibold">Require request moderation</span>
            <span className="mt-1 block text-xs font-normal text-slate-500">
              New meeting requests wait in the organiser queue before the target is
              notified.
            </span>
          </span>
        </label>

        {categories.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-slate-900">Category auto-accept</p>
            <p className="mt-1 text-xs text-slate-500">
              VIP categories auto-accept and schedule incoming requests.
            </p>
            <ul className="mt-2 space-y-2">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox
                    name={`autoAccept_${cat.id}`}
                    value="on"
                    defaultChecked={autoAcceptIds.has(cat.id)}
                  />
                  {cat.name}
                </label>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <Label htmlFor="meetingCapsJson">Meeting caps by category (JSON)</Label>
          <Input
            id="meetingCapsJson"
            name="meetingCapsJson"
            defaultValue={JSON.stringify(config.meetingCapsByCategory)}
            placeholder='[{"categoryId":"...","maxConcurrent":3}]'
          />
          <p className="mt-1 text-xs text-slate-500">
            Max concurrent scheduled meetings per category.
          </p>
        </div>

        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500 pt-2">
          Smart batch triggers
        </p>
        <div>
          <Label htmlFor="batchProfilesThreshold">Run batch when N profiles complete</Label>
          <Input
            id="batchProfilesThreshold"
            name="batchProfilesThreshold"
            type="number"
            min={1}
            placeholder="Off"
            defaultValue={config.batchTriggers.profilesThreshold ?? ""}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox
            name="batchDailyPreEvent"
            value="on"
            defaultChecked={config.batchTriggers.dailyPreEvent}
          />
          Daily pre-event batch (7 days before)
        </label>

        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500 pt-2">
          Meeting communications
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox
            name="reminder24h"
            value="on"
            defaultChecked={config.meetingReminders.enabled24h}
          />
          24-hour meeting reminders
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox
            name="reminder30min"
            value="on"
            defaultChecked={config.meetingReminders.enabled30min}
          />
          30-minute meeting reminders
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox
            name="postMeetingFollowUp"
            value="on"
            defaultChecked={config.postMeetingFollowUp.enabled}
          />
          Post-meeting follow-up email
        </label>
        {polls.length > 0 ? (
          <div>
            <Label htmlFor="followUpPollId">Follow-up poll (optional)</Label>
            <select
              id="followUpPollId"
              name="followUpPollId"
              defaultValue={config.postMeetingFollowUp.pollId ?? ""}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Default polls page</option>
              {polls.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end">
          <Button disabled={pending}>{pending ? "Saving…" : "Save operations"}</Button>
        </div>
      </form>
    </div>
  );
}
