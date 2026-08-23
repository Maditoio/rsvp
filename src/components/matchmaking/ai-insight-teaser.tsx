import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function AiInsightTeaser({
  eventId,
  eventAiEnabled = false,
  attendeeOptIn = false,
}: {
  eventId: string;
  eventAiEnabled?: boolean;
  attendeeOptIn?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white shadow-sm px-3 py-2">
      <Badge tone="accent">AI insight</Badge>
      {!eventAiEnabled ? (
        <p className="mt-2 text-xs text-slate-500">
          The organiser has not enabled AI explanations for this event.
          Structured matching still ranks connections from shared objectives.
        </p>
      ) : !attendeeOptIn ? (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs text-slate-500">
            AI can explain why a connection fits. Matching still uses shared
            objectives; explanations are optional.
          </p>
          <p className="text-xs text-slate-500">
            Enable{" "}
            <span className="font-semibold text-slate-700">
              Allow AI to explain my matches
            </span>{" "}
            in{" "}
            <Link
              href={`/me/events/${eventId}/privacy`}
              className="font-semibold text-slate-700 underline-offset-4 hover:underline"
            >
              privacy settings
            </Link>
            .
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          Opted in. Generate an explanation for this match when you are ready.
        </p>
      )}
    </div>
  );
}
