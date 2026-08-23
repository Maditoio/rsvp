import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";

/**
 * Transactional email chrome — Aurora v4.
 * Inline styles only (email clients). Keep colours in sync with docs/design-system.md.
 */
const aurora = {
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

type OutboundEmail = {
  organisationId: string;
  eventId?: string;
  invitationId?: string;
  toEmail: string;
  subject: string;
  html: string;
};

async function deliver(input: OutboundEmail) {
  const message = await prisma.emailMessage.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      invitationId: input.invitationId,
      toEmail: input.toEmail,
      subject: input.subject,
      status: "QUEUED",
    },
  });

  if (!process.env.RESEND_API_KEY) {
    console.info("[email:dev]", { to: input.toEmail, subject: input.subject });
    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    return { id: message.id, simulated: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "Bizcon RSVP <noreply@example.com>";
  const result = await resend.emails.send({
    from,
    to: input.toEmail,
    subject: input.subject,
    html: input.html,
  });

  await prisma.emailMessage.update({
    where: { id: message.id },
    data: {
      status: result.error ? "FAILED" : "SENT",
      sentAt: result.error ? null : new Date(),
      providerId: result.data?.id,
    },
  });

  if (result.error) throw new Error(result.error.message);
  return { id: message.id, simulated: false };
}

function p(html: string, muted = false) {
  const color = muted ? aurora.muted : aurora.body;
  const size = muted ? "13px" : "14px";
  return `<p style="margin:0 0 12px;font-size:${size};line-height:1.55;color:${color}">${html}</p>`;
}

function letter(title: string, eyebrow: string, body: string, href: string, cta: string) {
  return `
    <div style="margin:0;padding:0;background:${aurora.canvas};font-family:${aurora.font}">
      <div style="padding:32px 16px">
        <div style="max-width:560px;margin:0 auto;background:${aurora.surface};border-radius:20px;box-shadow:${aurora.shadow};overflow:hidden">
          <div style="padding:32px 28px 28px">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.02em;color:${aurora.indigo}">Bizcon</p>
            <p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${aurora.muted}">${escapeHtml(eyebrow)}</p>
            <h1 style="margin:0 0 16px;font-family:${aurora.font};font-size:22px;font-weight:700;line-height:1.3;color:${aurora.text}">${escapeHtml(title)}</h1>
            <div style="font-family:${aurora.font};font-size:14px;line-height:1.55;color:${aurora.body}">
              ${body}
            </div>
            <p style="margin:28px 0 0">
              <a href="${href}" style="display:inline-block;background:${aurora.indigo};color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:${aurora.font};font-size:14px;font-weight:600;box-shadow:${aurora.shadowAccent}">
                ${escapeHtml(cta)}
              </a>
            </p>
          </div>
        </div>
        <p style="max-width:560px;margin:16px auto 0;font-family:${aurora.font};font-size:12px;line-height:1.5;color:${aurora.muted};text-align:center">
          Event intelligence for professional summits.
        </p>
      </div>
    </div>
  `;
}

function letterPair(
  title: string,
  eyebrow: string,
  body: string,
  primaryHref: string,
  primaryCta: string,
  secondaryHref?: string,
  secondaryCta?: string,
) {
  const secondary =
    secondaryHref && secondaryCta
      ? `<p style="margin:16px 0 0;font-size:14px"><a href="${secondaryHref}" style="color:${aurora.indigo};font-weight:600;text-decoration:none">${escapeHtml(secondaryCta)}</a></p>`
      : "";
  return letter(title, eyebrow, `${body}${secondary}`, primaryHref, primaryCta);
}

export async function sendInvitationEmail(input: {
  organisationId: string;
  eventId: string;
  invitationId: string;
  toEmail: string;
  toName: string;
  eventName: string;
  acceptUrl: string;
  orgName: string;
}) {
  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    invitationId: input.invitationId,
    toEmail: input.toEmail,
    subject: `You're invited to ${input.eventName}`,
    html: letter(
      `You have been invited to ${input.eventName}`,
      "Invitation",
      `${p(`Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} would like you to attend.`)}
       ${p("This link is unique to you. Do not forward it.", true)}`,
      input.acceptUrl,
      "View invitation",
    ),
  });
}

export async function sendRegistrationConfirmationEmail(input: {
  organisationId: string;
  eventId: string;
  toEmail: string;
  toName: string;
  eventName: string;
  orgName: string;
  signUpUrl: string;
  appUrl: string;
  matchmakingUrl: string;
}) {
  const onlineSessions = await prisma.session.findMany({
    where: {
      eventId: input.eventId,
      organisationId: input.organisationId,
      format: { in: ["ONLINE", "HYBRID"] },
      onlineMeetings: {
        some: { provider: "TEAMS", joinUrl: { not: null } },
      },
    },
    include: {
      onlineMeetings: {
        where: { provider: "TEAMS", joinUrl: { not: null } },
        take: 1,
      },
    },
    orderBy: [{ startsAt: "asc" }, { title: "asc" }],
    take: 8,
  });

  const sessionBlocks = onlineSessions
    .map((session) => {
      const joinUrl = session.onlineMeetings[0]?.joinUrl;
      if (!joinUrl) return "";
      const when = session.startsAt
        ? `${session.startsAt.toLocaleString("en-GB", {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}${
            session.endsAt
              ? `–${session.endsAt.toLocaleString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""
          }`
        : "";
      return `<div style="margin:16px 0;padding:14px 0;border-top:1px solid ${aurora.borderSubtle}">
        <p style="margin:0;font-weight:600;color:${aurora.text}">${escapeHtml(session.title)}</p>
        ${when ? `<p style="margin:4px 0;color:${aurora.body};font-size:13px">${escapeHtml(when)}</p>` : ""}
        <p style="margin:4px 0;color:${aurora.muted};font-size:12px">Online — Microsoft Teams</p>
        <p style="margin:8px 0 0"><a href="${escapeHtml(joinUrl)}" style="color:${aurora.indigo};font-weight:600;text-decoration:none">Join Teams meeting</a></p>
      </div>`;
    })
    .join("");

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject: `Registration confirmed for ${input.eventName}`,
    html: letter(
      `Your place at ${input.eventName} is registered`,
      "Registration",
      `${p(`Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} has recorded your registration.`)}
       ${p(`Create an account with <strong style="color:${aurora.text}">${escapeHtml(input.toEmail)}</strong> to open the event app. There you can browse the agenda, request meetings, complete your matching profile, and access your check-in QR code on event day.`)}
       <ul style="margin:0 0 12px;padding-left:18px;color:${aurora.body};font-size:14px;line-height:1.6">
         <li>Meetings and connection requests</li>
         <li>Agenda and online sessions</li>
         <li>Matchmaking directory</li>
         <li>Check-in QR code in the app</li>
       </ul>
       ${sessionBlocks}
       ${p("After signing up, complete your matching profile so the directory can introduce the right people.", true)}`,
      input.signUpUrl,
      "Create account",
    ),
  });
}

export async function sendOrganizerWelcomeEmail(input: {
  organisationId: string;
  toEmail: string;
  toName: string;
  orgName: string;
  loginUrl: string;
}) {
  return deliver({
    organisationId: input.organisationId,
    toEmail: input.toEmail,
    subject: `Welcome to ${input.orgName} on Bizcon RSVP`,
    html: letter(
      `Your organiser workspace is ready`,
      "Welcome",
      `${p(`Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} is set up on Bizcon RSVP.`)}
       ${p("Use the platform console to manage invitations, registration, meetings, check-in, and event communications.")}`,
      input.loginUrl,
      "Open organiser console",
    ),
  });
}

export async function sendMeetingRequestEmail(input: {
  organisationId: string;
  eventId: string;
  toEmail: string;
  toName: string;
  eventName: string;
  requesterName: string;
  requesterCompany: string | null;
  requesterJobTitle: string | null;
  message: string | null;
  acceptUrl: string;
  declineUrl: string;
  inAppUrl: string;
}) {
  const details = [
    input.requesterCompany ? `<strong style="color:${aurora.text}">${escapeHtml(input.requesterCompany)}</strong>` : null,
    input.requesterJobTitle ? escapeHtml(input.requesterJobTitle) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const quote = input.message
    ? `<blockquote style="margin:16px 0;padding:14px 16px;border-radius:12px;border:1px solid ${aurora.indigoBorder};background:${aurora.indigoSoft};color:${aurora.body};font-size:14px;line-height:1.55">${escapeHtml(input.message)}</blockquote>`
    : "";

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject: `${input.requesterName} would like to connect at ${input.eventName}`,
    html: letterPair(
      `${input.requesterName} sent a connection request`,
      "Connection request",
      `${p(`Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.requesterName)} would like to meet at ${escapeHtml(input.eventName)}.`)}
       ${details ? `<p style="margin:0 0 12px;color:${aurora.body};font-size:14px">${details}</p>` : ""}
       ${quote}
       ${p("Accepting will create a meeting you can reschedule in the app.", true)}`,
      input.acceptUrl,
      "Accept request",
      input.declineUrl,
      "Decline request",
    ),
  });
}

export async function sendReminderEmail(input: {
  organisationId: string;
  eventId: string;
  invitationId?: string;
  toEmail: string;
  toName: string;
  eventName: string;
  orgName: string;
  href: string;
  kind: "invitation" | "registration";
}) {
  const subject =
    input.kind === "invitation"
      ? `Reminder: invitation to ${input.eventName}`
      : `Reminder: complete registration for ${input.eventName}`;
  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    invitationId: input.invitationId,
    toEmail: input.toEmail,
    subject,
    html: letter(
      input.kind === "invitation"
        ? `Please respond to ${input.eventName}`
        : `Please complete registration for ${input.eventName}`,
      "Reminder",
      p(
        `Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} is waiting for your response.`,
      ),
      input.href,
      input.kind === "invitation" ? "Open invitation" : "Complete registration",
    ),
  });
}

export async function sendEventStaffRoleEmail(input: {
  organisationId: string;
  eventId: string;
  toEmail: string;
  toName: string;
  eventName: string;
  orgName: string;
  roleLabel: string;
  previousRoleLabel?: string | null;
  workspaceUrl: string;
  roleDescription: string;
}) {
  const changed = Boolean(input.previousRoleLabel);
  const subject = changed
    ? `Your role at ${input.eventName} is now ${input.roleLabel}`
    : `You've been assigned as ${input.roleLabel} for ${input.eventName}`;

  const body = changed
    ? `${p(`Hello ${escapeHtml(input.toName)}, your staff role for <strong style="color:${aurora.text}">${escapeHtml(input.eventName)}</strong> (${escapeHtml(input.orgName)}) has been updated from ${escapeHtml(input.previousRoleLabel!)} to <strong style="color:${aurora.text}">${escapeHtml(input.roleLabel)}</strong>.`)}
       ${p(`${escapeHtml(input.roleDescription)}.`)}
       ${p(`Sign in with <strong style="color:${aurora.text}">${escapeHtml(input.toEmail)}</strong> to open your workspace.`, true)}`
    : `${p(`Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} has assigned you as <strong style="color:${aurora.text}">${escapeHtml(input.roleLabel)}</strong> for <strong style="color:${aurora.text}">${escapeHtml(input.eventName)}</strong>.`)}
       ${p(`${escapeHtml(input.roleDescription)}.`)}
       ${p(`Sign in with <strong style="color:${aurora.text}">${escapeHtml(input.toEmail)}</strong> to open your workspace.`, true)}`;

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject,
    html: letter(
      changed ? `Your role has been updated` : `You have a new staff role`,
      "Staff access",
      body,
      input.workspaceUrl,
      "Open workspace",
    ),
  });
}

export async function sendApplicationDecisionEmail(input: {
  organisationId: string;
  eventId: string;
  toEmail: string;
  toName: string;
  eventName: string;
  approved: boolean;
  href?: string;
}) {
  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject: input.approved
      ? `Application approved for ${input.eventName}`
      : `Application update for ${input.eventName}`,
    html: letter(
      input.approved
        ? `You have been invited to ${input.eventName}`
        : `Your application was not approved`,
      "Application",
      input.approved
        ? p(
            `Hello ${escapeHtml(input.toName)}, your application has been approved. Use the unique invitation link to accept and then register.`,
          )
        : p(
            `Hello ${escapeHtml(input.toName)}, the organiser has not approved this application.`,
          ),
      input.href ?? "#",
      input.approved ? "View invitation" : "Close",
    ),
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
