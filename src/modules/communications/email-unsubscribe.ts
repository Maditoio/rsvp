import { getAppUrl } from "@/lib/utils";

/** Consent purpose recorded when a recipient opts out via /unsubscribe. */
export const PLATFORM_EMAIL_UNSUBSCRIBE_PURPOSE = "platform_emails";

export function normalizeRecipientEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildUnsubscribeUrl(email: string) {
  return `${getAppUrl()}/unsubscribe?email=${encodeURIComponent(normalizeRecipientEmail(email))}`;
}

/** RFC 2369 + RFC 8058 headers for inbox one-click unsubscribe. */
export function buildListUnsubscribeHeaders(email: string): Record<string, string> {
  const url = buildUnsubscribeUrl(email);
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Guard used before send — every outbound HTML body must link to /unsubscribe. */
export function emailHtmlIncludesUnsubscribe(html: string, toEmail: string) {
  const normalized = normalizeRecipientEmail(toEmail);
  return (
    html.includes(buildUnsubscribeUrl(toEmail)) ||
    html.includes(`/unsubscribe?email=${encodeURIComponent(normalized)}`)
  );
}
