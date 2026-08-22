import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";

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

function letter(title: string, eyebrow: string, body: string, href: string, cta: string) {
  return `
    <div style="font-family:'Public Sans',Arial,sans-serif;background:#F6F5F2;padding:32px">
      <div style="max-width:560px;margin:auto;background:#FFFFFF;border:1px solid #E4E0D6;border-radius:6px;padding:32px">
        <p style="letter-spacing:0.06em;text-transform:uppercase;font-size:11px;font-weight:600;color:#B4923F">${escapeHtml(eyebrow)}</p>
        <h1 style="font-family:Georgia,serif;font-size:26px;margin:8px 0 16px;color:#1F2937">${escapeHtml(title)}</h1>
        ${body}
        <p style="margin:28px 0 8px">
          <a href="${href}" style="display:inline-block;background:#1F2937;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:600">
            ${escapeHtml(cta)}
          </a>
        </p>
      </div>
    </div>
  `;
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
      `<p style="color:#5F5A4D">Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} would like you to attend.</p>
       <p style="font-size:13px;color:#8B8578">This link is unique to you. Do not forward it.</p>`,
      input.acceptUrl,
      "View invitation",
    ),
  });
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
      ? `<p style="margin:12px 0 0"><a href="${secondaryHref}" style="color:#1F2937;font-weight:600">${escapeHtml(secondaryCta)}</a></p>`
      : "";
  return letter(title, eyebrow, `${body}${secondary}`, primaryHref, primaryCta);
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
      return `<div style="margin:16px 0;padding:12px 0;border-top:1px solid #E4E0D6">
        <p style="margin:0;font-weight:600;color:#1F2937">${escapeHtml(session.title)}</p>
        ${when ? `<p style="margin:4px 0;color:#5F5A4D;font-size:13px">${escapeHtml(when)}</p>` : ""}
        <p style="margin:4px 0;color:#8B8578;font-size:12px">Online — Microsoft Teams</p>
        <p style="margin:8px 0 0"><a href="${escapeHtml(joinUrl)}" style="color:#1F2937;font-weight:600">Join Teams meeting</a></p>
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
      `<p style="color:#5F5A4D">Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} has recorded your registration.</p>
       <p style="color:#5F5A4D">Create an account with <strong>${escapeHtml(input.toEmail)}</strong> to open the event app. There you can browse the agenda, request meetings, complete your matching profile, and access your check-in QR code on event day.</p>
       <ul style="color:#5F5A4D;font-size:14px;line-height:1.6;padding-left:18px">
         <li>Meetings and connection requests</li>
         <li>Agenda and online sessions</li>
         <li>Matchmaking directory</li>
         <li>Check-in QR code in the app</li>
       </ul>
       ${sessionBlocks}
       <p style="color:#8B8578;font-size:13px">After signing up, complete your matching profile so the directory can introduce the right people.</p>`,
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
      `<p style="color:#5F5A4D">Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} is set up on Bizcon RSVP.</p>
       <p style="color:#5F5A4D">Use the platform console to manage invitations, registration, meetings, check-in, and event communications.</p>`,
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
    input.requesterCompany ? `<strong>${escapeHtml(input.requesterCompany)}</strong>` : null,
    input.requesterJobTitle ? escapeHtml(input.requesterJobTitle) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject: `${input.requesterName} would like to connect at ${input.eventName}`,
    html: letterPair(
      `${input.requesterName} sent a connection request`,
      "Connection request",
      `<p style="color:#5F5A4D">Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.requesterName)} would like to meet at ${escapeHtml(input.eventName)}.</p>
       ${details ? `<p style="color:#5F5A4D;font-size:14px">${details}</p>` : ""}
       ${input.message ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #B4923F;background:#FBF7EE;color:#5F5A4D">${escapeHtml(input.message)}</blockquote>` : ""}
       <p style="color:#8B8578;font-size:13px">Accepting will create a meeting you can reschedule in the app.</p>`,
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
      `<p style="color:#5F5A4D">Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} is waiting for your response.</p>`,
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
    ? `<p style="color:#5F5A4D">Hello ${escapeHtml(input.toName)}, your staff role for <strong>${escapeHtml(input.eventName)}</strong> (${escapeHtml(input.orgName)}) has been updated from ${escapeHtml(input.previousRoleLabel!)} to <strong>${escapeHtml(input.roleLabel)}</strong>.</p>
       <p style="color:#5F5A4D">${escapeHtml(input.roleDescription)}.</p>
       <p style="color:#8B8578;font-size:13px">Sign in with <strong>${escapeHtml(input.toEmail)}</strong> to open your workspace.</p>`
    : `<p style="color:#5F5A4D">Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} has assigned you as <strong>${escapeHtml(input.roleLabel)}</strong> for <strong>${escapeHtml(input.eventName)}</strong>.</p>
       <p style="color:#5F5A4D">${escapeHtml(input.roleDescription)}.</p>
       <p style="color:#8B8578;font-size:13px">Sign in with <strong>${escapeHtml(input.toEmail)}</strong> to open your workspace.</p>`;

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
        ? `<p style="color:#5F5A4D">Hello ${escapeHtml(input.toName)}, your application has been approved. Use the unique invitation link to accept and then register.</p>`
        : `<p style="color:#5F5A4D">Hello ${escapeHtml(input.toName)}, the organiser has not approved this application.</p>`,
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
