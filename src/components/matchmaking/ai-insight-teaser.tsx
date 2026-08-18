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
    <div className="rounded-md border border-stone-200 bg-stone-0 px-3 py-2">
      <Badge tone="accent">AI insight</Badge>
      {!eventAiEnabled ? (
        <p className="mt-2 text-xs text-stone-500">
          Insights are available when the organiser enables them for this event.
        </p>
      ) : !attendeeOptIn ? (
        <p className="mt-2 text-xs text-stone-500">
          Allow AI to explain your matches in{" "}
          <Link
            href={`/me/events/${eventId}/privacy`}
            className="text-ink-700 underline"
          >
            privacy settings
          </Link>
          . Matching still uses shared objectives; explanations are optional.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-stone-700">
            Explanation will appear here for this match.
          </p>
          <p className="mt-1 text-xs text-stone-500">
            AI can explain why this connection fits. This space is prepared; no
            explanation has been generated.
          </p>
        </>
      )}
    </div>
  );
}
