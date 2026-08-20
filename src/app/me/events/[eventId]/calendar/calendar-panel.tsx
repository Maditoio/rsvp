"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { disconnectCalendar } from "@/modules/calendar/actions";

export function CalendarPanel({
  eventId,
  connection,
  googleAuthUrl,
  microsoftAuthUrl,
}: {
  eventId: string;
  connection: { id: string; provider: string } | null;
  googleAuthUrl: string;
  microsoftAuthUrl: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="max-w-lg space-y-6">
      {connection ? (
        <div className="rounded-md border border-stone-200 bg-stone-0 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink-800">
                {connection.provider === "google"
                  ? "Google Calendar"
                  : "Microsoft Outlook"}{" "}
                connected
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                Meetings will sync to your calendar automatically.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  try {
                    await disconnectCalendar(eventId, connection.id);
                    router.refresh();
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Could not disconnect",
                    );
                  }
                });
              }}
            >
              {pending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <a
            href={googleAuthUrl}
            className="inline-flex h-10 items-center justify-center rounded-sm border border-stone-200 bg-stone-0 px-4 text-sm font-medium text-ink-800 hover:border-ink-400 hover:bg-stone-50"
          >
            Connect Google Calendar
          </a>

          {microsoftAuthUrl ? (
            <a
              href={microsoftAuthUrl}
              className="inline-flex h-10 items-center justify-center rounded-sm border border-stone-200 bg-stone-0 px-4 text-sm font-medium text-ink-800 hover:border-ink-400 hover:bg-stone-50"
            >
              Connect Microsoft Outlook
            </a>
          ) : (
            <div>
              <button
                type="button"
                disabled
                className="inline-flex h-10 items-center justify-center rounded-sm border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-400 cursor-not-allowed"
              >
                Connect Microsoft Outlook
              </button>
              <p className="mt-1 text-xs text-stone-500">Coming soon</p>
            </div>
          )}
        </div>
      )}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
