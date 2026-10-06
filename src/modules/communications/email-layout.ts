import { getAppUrl } from "@/lib/utils";
import { buildUnsubscribeUrl } from "@/modules/communications/email-unsubscribe";
import {
  DEFAULT_EMAIL_ACCENT,
  DEFAULT_EMAIL_ACCENT_BORDER,
  DEFAULT_EMAIL_ACCENT_SHADOW,
  DEFAULT_EMAIL_ACCENT_SOFT,
  type EmailBranding,
  resolveEmailBranding,
} from "@/modules/communications/email-branding";

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
  indigo: DEFAULT_EMAIL_ACCENT,
  indigoSoft: DEFAULT_EMAIL_ACCENT_SOFT,
  indigoBorder: DEFAULT_EMAIL_ACCENT_BORDER,
  font: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  shadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.05)",
  shadowAccent: DEFAULT_EMAIL_ACCENT_SHADOW,
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

export function defaultEmailBranding(): EmailBranding {
  return resolveEmailBranding({});
}

function trustFooter(
  orgName: string,
  toEmail: string,
  branding: EmailBranding,
  footerKind: "invitation" | "message" = "message",
) {
  const support = supportEmail();
  const appUrl = getAppUrl();
  const privacyUrl = `${appUrl}/privacystatment`;
  const termsUrl = `${appUrl}/termsofservice`;
  const unsubscribeUrl = buildUnsubscribeUrl(toEmail);
  const org = escapeHtml(orgName);
  const lead =
    footerKind === "invitation"
      ? `You were invited by <strong style="color:${aurora.body}">${org}</strong> through <strong style="color:${aurora.body}">Bizcon RSVP</strong>.`
      : `This email was sent by <strong style="color:${aurora.body}">Bizcon RSVP</strong> on behalf of <strong style="color:${aurora.body}">${org}</strong>.`;

  return `<div style="max-width:560px;margin:16px auto 0;font-family:${aurora.font};font-size:11px;line-height:1.55;color:${aurora.muted};text-align:center">
    <p style="margin:0 0 4px">${lead}</p>
    <p style="margin:0 0 10px">Questions? Contact <a href="mailto:${escapeHtml(support)}" style="color:${branding.accentColor};text-decoration:none">${escapeHtml(support)}</a></p>
    <p style="margin:0;font-size:10px">
      <a href="${privacyUrl}" style="color:${branding.accentColor};text-decoration:none">Privacy</a>
      <span style="color:${aurora.border};padding:0 6px">·</span>
      <a href="${termsUrl}" style="color:${branding.accentColor};text-decoration:none">Terms</a>
      <span style="color:${aurora.border};padding:0 6px">·</span>
      <a href="${unsubscribeUrl}" style="color:${branding.accentColor};text-decoration:none">Unsubscribe</a>
    </p>
  </div>`;
}

function brandBanner(branding: EmailBranding) {
  if (!branding.bannerUrl) return "";
  const maxHeight = branding.heroCard ? "720px" : "180px";
  return `<img src="${escapeHtml(branding.bannerUrl)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;max-height:${maxHeight};object-fit:cover;border:0;outline:none;text-decoration:none" />`;
}

function brandHeader(branding: EmailBranding) {
  if (branding.heroCard) return "";

  if (branding.logoUrl) {
    return `<div style="margin:0 0 20px">
      <img src="${escapeHtml(branding.logoUrl)}" alt="" width="160" style="display:block;max-width:160px;height:auto;border:0;outline:none;text-decoration:none" />
    </div>`;
  }

  if (branding.bannerUrl) {
    return "";
  }

  return `<p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.02em;color:${branding.accentColor}">Bizcon RSVP</p>`;
}

export function letter(opts: {
  title: string;
  eyebrow: string;
  body: string;
  orgName: string;
  toEmail: string;
  href?: string;
  cta?: string;
  branding?: EmailBranding;
  /** Invitation emails use “You were invited by…”; others use on-behalf copy. */
  footerKind?: "invitation" | "message";
}) {
  const branding = opts.branding ?? defaultEmailBranding();
  const isInvitation = opts.footerKind === "invitation" || branding.heroCard;
  const cardRadius = isInvitation ? "0" : "20px";
  const cta =
    opts.href && opts.cta && opts.href !== "#"
      ? `<p style="margin:28px 0 0">
          <a href="${opts.href}" style="display:inline-block;background:${branding.accentColor};color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:${aurora.font};font-size:14px;font-weight:600;box-shadow:${branding.accentShadow}">
            ${escapeHtml(opts.cta)}
          </a>
        </p>`
      : "";

  return `
    <div style="margin:0;padding:0;background:${aurora.canvas};font-family:${aurora.font}">
      <div style="padding:32px 16px">
        <div style="max-width:560px;margin:0 auto;background:${aurora.surface};border-radius:${cardRadius};box-shadow:${aurora.shadow};overflow:hidden">
          ${brandBanner(branding)}
          <div style="padding:32px 28px 28px">
            ${brandHeader(branding)}
            ${
              branding.heroCard
                ? ""
                : `<p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${aurora.muted}">${escapeHtml(opts.eyebrow)}</p>
            <h1 style="margin:0 0 16px;font-family:${aurora.font};font-size:22px;font-weight:700;line-height:1.3;color:${aurora.text}">${escapeHtml(opts.title)}</h1>`
            }
            <div style="font-family:${aurora.font};font-size:14px;line-height:1.55;color:${aurora.body}">
              ${opts.body}
            </div>
            ${cta}
          </div>
        </div>
        ${trustFooter(opts.orgName, opts.toEmail, branding, opts.footerKind ?? "message")}
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
  branding?: EmailBranding;
  footerKind?: "invitation" | "message";
}) {
  const branding = opts.branding ?? defaultEmailBranding();
  const secondary =
    opts.secondaryHref && opts.secondaryCta
      ? `<p style="margin:16px 0 0;font-size:14px"><a href="${opts.secondaryHref}" style="color:${branding.accentColor};font-weight:600;text-decoration:none">${escapeHtml(opts.secondaryCta)}</a></p>`
      : "";
  return letter({
    title: opts.title,
    eyebrow: opts.eyebrow,
    body: `${opts.body}${secondary}`,
    orgName: opts.orgName,
    toEmail: opts.toEmail,
    href: opts.primaryHref,
    cta: opts.primaryCta,
    branding,
    footerKind: opts.footerKind,
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
  "sendPostEventFollowUpEmail",
  "sendApplicationDecisionEmail",
] as const;
