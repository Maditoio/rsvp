"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendEventReminders } from "@/modules/events/settings";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Table, Td, Th } from "@/components/ui/table";

const selectClassName =
  "h-[42px] w-full rounded-sm border border-stone-300 bg-stone-0 px-4 text-[0.9375rem] text-ink-700 outline-none focus:border-ink-700 focus:ring-3 focus:ring-ink-700/12";

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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Outreach
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink-800">
            Communications
          </h1>
          <p className="mt-1 text-sm text-stone-700">
            Remind people who have not accepted, or who accepted but have not
            registered.
          </p>
        </div>
        {canSend ? (
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
        ) : null}
      </div>

      {notice ? <p className="text-sm text-moss-600">{notice}</p> : null}

      {messages.length === 0 ? (
        <p className="text-sm text-stone-700">No messages have been sent yet.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>To</Th>
              <Th>Subject</Th>
              <Th>Status</Th>
              <Th>Sent</Th>
            </tr>
          </thead>
          <tbody>
            {messages.map((row) => (
              <tr key={row.id}>
                <Td>{row.toEmail}</Td>
                <Td>{row.subject}</Td>
                <Td>{row.status}</Td>
                <Td>{row.sentAt || "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
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
                setNotice(`Sent ${result.sent} reminder${result.sent === 1 ? "" : "s"}.`);
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
            <select id="audience" name="audience" required className={selectClassName}>
              <option value="unaccepted">Invited, not yet accepted</option>
              <option value="unregistered">Accepted, not yet registered</option>
            </select>
          </div>
          <p className="text-xs text-stone-500">
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
