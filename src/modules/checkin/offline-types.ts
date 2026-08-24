/** Client-safe offline check-in types (no server imports). */

export type OfflinePackAttendee = {
  attendeeId: string;
  /** SHA-256 hex of the opaque QR token — never the raw token. */
  qrTokenHash: string;
  name: string;
  company: string | null;
  category: string | null;
  alreadyCheckedIn: boolean;
  checkedInAt: string | null;
};

export type OfflineCheckInPack = {
  organisationId: string;
  eventId: string;
  orgSlug: string;
  eventName: string;
  downloadedAt: string;
  /** ISO — pack should be refreshed after this. */
  expiresAt: string;
  attendeeCount: number;
  attendees: OfflinePackAttendee[];
};

export type OfflinePendingCheckIn = {
  clientId: string;
  attendeeId: string;
  name: string;
  checkedInAt: string;
  status: "pending" | "syncing" | "synced" | "failed";
  error?: string;
};
