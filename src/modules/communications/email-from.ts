/** Strip display-name wrappers so Reply-To / From mailboxes are plain addresses. */
export function bareEmailAddress(raw: string) {
  const trimmed = raw.trim();
  const angled = trimmed.match(/<([^>\s]+@[^>\s]+)>/);
  if (angled?.[1]) return angled[1].trim().toLowerCase();
  if (/^[^\s<>]+@[^\s<>]+$/.test(trimmed)) return trimmed.toLowerCase();
  return trimmed.replace(/^"|"$/g, "").trim().toLowerCase();
}

function defaultFromMailbox() {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) {
    const extracted = bareEmailAddress(configured);
    if (extracted.includes("@")) return extracted;
  }
  return "invites@bizconrsvp.com";
}

/** Outlook-friendly From: host name first, platform second. */
export function formatOutboundFrom(orgName?: string | null) {
  const mailbox = defaultFromMailbox();
  const host = orgName
    ?.trim()
    .replace(/[\r\n"\\<>]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 64)
    .trim();
  if (!host) return `Bizcon RSVP <${mailbox}>`;
  return `"${host} via Bizcon RSVP" <${mailbox}>`;
}
