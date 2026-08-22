import { cn } from "@/lib/utils";

export function TeamsMark({
  className,
  muted = false,
}: {
  className?: string;
  muted?: boolean;
}) {
  if (muted) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className={cn("shrink-0", className)}
      >
        <path
          fill="currentColor"
          className="text-stone-400"
          d="M16.5 7.2c1.2 0 2.2-1 2.2-2.2S17.7 2.8 16.5 2.8 14.3 3.8 14.3 5s1 2.2 2.2 2.2z"
        />
        <path
          fill="currentColor"
          className="text-stone-400"
          d="M19.8 8.5h-3.2c-.7 0-1.3.4-1.6 1v5.3c0 1.3 1.1 2.4 2.4 2.4h.1c1.5 0 2.7-1.2 2.7-2.7v-4.6c0-.8-.6-1.4-1.4-1.4z"
        />
        <path
          fill="currentColor"
          className="text-stone-400"
          d="M8.8 7.8c1.5 0 2.7-1.2 2.7-2.7S10.3 2.4 8.8 2.4 6.1 3.6 6.1 5.1s1.2 2.7 2.7 2.7z"
        />
        <path
          fill="currentColor"
          className="text-stone-400"
          d="M13.2 9H4.5C3.7 9 3 9.7 3 10.5v5.8C3 18.2 4.8 20 7 20h3.5c2.2 0 4-1.8 4-4v-5.5c0-.8-.7-1.5-1.5-1.5h.2z"
        />
      </svg>
    );
  }

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path
        fill="#5059C9"
        d="M16.5 7.2c1.2 0 2.2-1 2.2-2.2S17.7 2.8 16.5 2.8 14.3 3.8 14.3 5s1 2.2 2.2 2.2z"
      />
      <path
        fill="#7B83EB"
        d="M19.8 8.5h-3.2c-.7 0-1.3.4-1.6 1v5.3c0 1.3 1.1 2.4 2.4 2.4h.1c1.5 0 2.7-1.2 2.7-2.7v-4.6c0-.8-.6-1.4-1.4-1.4z"
      />
      <path
        fill="#4B53BC"
        d="M8.8 7.8c1.5 0 2.7-1.2 2.7-2.7S10.3 2.4 8.8 2.4 6.1 3.6 6.1 5.1s1.2 2.7 2.7 2.7z"
      />
      <path
        fill="#7B83EB"
        d="M13.2 9H4.5C3.7 9 3 9.7 3 10.5v5.8C3 18.2 4.8 20 7 20h3.5c2.2 0 4-1.8 4-4v-5.5c0-.8-.7-1.5-1.5-1.5h.2z"
      />
    </svg>
  );
}

export function ZoomMark({
  className,
  muted = true,
}: {
  className?: string;
  muted?: boolean;
}) {
  if (muted) {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className={cn("shrink-0", className)}
      >
        <rect width="24" height="24" rx="4" fill="currentColor" className="text-stone-300" />
        <path
          fill="currentColor"
          className="text-stone-400"
          d="M5.5 8.5h7.2c.7 0 1.3.6 1.3 1.3v4.4c0 .7-.6 1.3-1.3 1.3H5.5c-.7 0-1.3-.6-1.3-1.3V9.8c0-.7.6-1.3 1.3-1.3zm9.2 1.2 3.6-2.1c.5-.3 1.2 0 1.2.6v6.6c0 .6-.7.9-1.2.6l-3.6-2.1v-3.6z"
        />
      </svg>
    );
  }

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect width="24" height="24" rx="4" fill="#2D8CFF" />
      <path
        fill="#fff"
        d="M5.5 8.5h7.2c.7 0 1.3.6 1.3 1.3v4.4c0 .7-.6 1.3-1.3 1.3H5.5c-.7 0-1.3-.6-1.3-1.3V9.8c0-.7.6-1.3 1.3-1.3zm9.2 1.2 3.6-2.1c.5-.3 1.2 0 1.2.6v6.6c0 .6-.7.9-1.2.6l-3.6-2.1v-3.6z"
      />
    </svg>
  );
}

export function SessionProviderIcons({
  format,
  teamsMeetingUrl,
  zoomMeetingUrl,
  className,
}: {
  format: "PHYSICAL" | "ONLINE" | "HYBRID";
  teamsMeetingUrl?: string | null;
  zoomMeetingUrl?: string | null;
  className?: string;
}) {
  if (format === "PHYSICAL") return null;

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-label="Online meeting providers"
    >
      <TeamsMark muted={!teamsMeetingUrl} />
      <ZoomMark muted={!zoomMeetingUrl} />
    </div>
  );
}
