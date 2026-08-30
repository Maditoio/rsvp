import { getAppUrl } from "@/lib/utils";
import { buildUnsubscribeUrl } from "@/modules/communications/email-unsubscribe";

/**
 * Shared HTML email layout — no server-only imports so compliance tests can run in Vitest.
 * All outbound templates must render through letter() / letterPair(), which append trustFooter().
 */
export const aurora = {
  canvas: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",
  text: "#0F172A",
  body: "#475569",
  muted: "#94A3B8",
  indigo: "#4F46E5",
  indigoSoft: "#EEF2FF",
  indigoBorder: "#C7D2FE",
  font: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  shadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.05)",
  shadowAccent: "0 4px 12px rgba(79,70,229,0.28)",
} as const;

export function supportEmail() {
  return (
    process.env.RESEND_SUPPORT_EMAIL?.trim() ||
    process.env.RESEND_REPLY_TO_EMAIL?.trim() ||
    "support@bizconrsvp.com"
  );
}

export function p(html: string, muted = false) {
  const color = muted ? aurora.muted : aurora.body;
  const size = muted ? "13px" : "14px";
  return `<p style="margin:0 0 12px;font-size:${size};line-height:1.55;color:${color}">${html}</p>`;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function trustFooter(orgName: string, toEmail: string) {
  const support = supportEmail();
  const appUrl = getAppUrl();
  const privacyUrl = `${appUrl}/privacystatment`;
  const termsUrl = `${appUrl}/termsofservice`;
  const unsubscribeUrl = buildUnsubscribeUrl(toEmail);
  const email = escapeHtml(toEmail.trim().toLowerCase());

  return `<div style="max-width:560px;margin:16px auto 0;font-family:${aurora.font};font-size:11px;line-height:1.55;color:${aurora.muted};text-align:center">
    <p style="margin:0 0 8px">This message was sent via <strong style="color:${aurora.body}">Bizcon RSVP</strong> on behalf of <strong style="color:${aurora.body}">${escapeHtml(orgName)}</strong>. Questions? Contact <a href="mailto:${escapeHtml(support)}" style="color:${aurora.indigo};text-decoration:none">${escapeHtml(support)}</a></p>
    <p style="margin:0 0 10px;font-size:10px;line-height:1.5;color:${aurora.muted}">We sent this email to ${email} because you signed up for or have recently used Bizcon RSVP. Our service and marketing emails are to provide important updates and reminders about your projects and subscription. You can unsubscribe at any time using the link below.</p>
    <p style="margin:0;font-size:10px">
      <a href="${privacyUrl}" style="color:${aurora.indigo};text-decoration:none">Privacy</a>
      <span style="color:${aurora.border};padding:0 6px">·</span>
      <a href="${termsUrl}" style="color:${aurora.indigo};text-decoration:none">Terms</a>
      <span style="color:${aurora.border};padding:0 6px">·</span>
      <a href="${unsubscribeUrl}" style="color:${aurora.indigo};text-decoration:none">Unsubscribe</a>
    </p>
  </div>`;
}

export function letter(opts: {
  title: string;
  eyebrow: string;
  body: string;
  orgName: string;
  toEmail: string;
  href?: string;
  cta?: string;
}) {
  const cta =
    opts.href && opts.cta && opts.href !== "#"
      ? `<p style="margin:28px 0 0">
          <a href="${opts.href}" style="display:inline-block;background:${aurora.indigo};color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:${aurora.font};font-size:14px;font-weight:600;box-shadow:${aurora.shadowAccent}">
            ${escapeHtml(opts.cta)}
          </a>
        </p>`
      : "";

  return `
    <div style="margin:0;padding:0;background:${aurora.canvas};font-family:${aurora.font}">
      <div style="padding:32px 16px">
        <div style="max-width:560px;margin:0 auto;background:${aurora.surface};border-radius:20px;box-shadow:${aurora.shadow};overflow:hidden">
          <div style="padding:32px 28px 28px">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.02em;color:${aurora.indigo}">Bizcon RSVP</p>
            <p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${aurora.muted}">${escapeHtml(opts.eyebrow)}</p>
            <h1 style="margin:0 0 16px;font-family:${aurora.font};font-size:22px;font-weight:700;line-height:1.3;color:${aurora.text}">${escapeHtml(opts.title)}</h1>
            <div style="font-family:${aurora.font};font-size:14px;line-height:1.55;color:${aurora.body}">
              ${opts.body}
            </div>
            ${cta}
          </div>
        </div>
        ${trustFooter(opts.orgName, opts.toEmail)}
      </div>
    </div>
  `;
}

export function letterPair(opts: {
  title: string;
  eyebrow: string;
  body: string;
  orgName: string;
  toEmail: string;
  primaryHref: string;
  primaryCta: string;
  secondaryHref?: string;
  secondaryCta?: string;
}) {
  const secondary =
    opts.secondaryHref && opts.secondaryCta
      ? `<p style="margin:16px 0 0;font-size:14px"><a href="${opts.secondaryHref}" style="color:${aurora.indigo};font-weight:600;text-decoration:none">${escapeHtml(opts.secondaryCta)}</a></p>`
      : "";
  return letter({
    title: opts.title,
    eyebrow: opts.eyebrow,
    body: `${opts.body}${secondary}`,
    orgName: opts.orgName,
    toEmail: opts.toEmail,
    href: opts.primaryHref,
    cta: opts.primaryCta,
  });
}

/** All outbound senders — used by compliance tests to ensure nothing bypasses letter(). */
export const OUTBOUND_EMAIL_TEMPLATES = [
  "sendInvitationEmail",
  "sendRegistrationConfirmationEmail",
  "sendOrganizerWelcomeEmail",
  "sendMeetingRequestEmail",
  "sendReminderEmail",
  "sendEventStaffRoleEmail",
  "sendMeetingReminderEmail",
  "sendUnscheduledMeetingNudgeEmail",
  "sendPostMeetingFollowUpEmail",
  "sendApplicationDecisionEmail",
] as const;
