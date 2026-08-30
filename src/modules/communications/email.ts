import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { formatEventWindow } from "@/lib/utils";
import { buildWelcomePackPdf } from "@/modules/communications/welcome-pack-pdf";
import {
  buildListUnsubscribeHeaders,
  emailHtmlIncludesUnsubscribe,
} from "@/modules/communications/email-unsubscribe";
import {
  aurora,
  escapeHtml,
  letter,
  letterPair,
  p,
} from "@/modules/communications/email-layout";

/**
 * Transactional email chrome — Aurora v4.
 * Inline styles only (email clients). Keep colours in sync with docs/design-system.md.
 *
 * Deliverability notes: include host, date, venue, purpose, and a real contact in every
 * message. Prefer invites@… + Reply-To over noreply@.
 */

type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type EventMailContext = {
  eventName: string;
  orgName: string;
  venue: string | null;
  timezone: string;
  startsAt: Date | null;
  endsAt: Date | null;
  description: string | null;
};

type OutboundEmail = {
  organisationId: string;
  eventId?: string;
  invitationId?: string;
  toEmail: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
};

function supportEmail() {
  return (
    process.env.RESEND_SUPPORT_EMAIL?.trim() ||
    process.env.RESEND_REPLY_TO_EMAIL?.trim() ||
    "support@bizconrsvp.com"
  );
}

function replyToAddress() {
  return (
    process.env.RESEND_REPLY_TO_EMAIL?.trim() ||
    process.env.RESEND_SUPPORT_EMAIL?.trim() ||
    supportEmail()
  );
}

async function deliver(input: OutboundEmail) {
  if (!emailHtmlIncludesUnsubscribe(input.html, input.toEmail)) {
    throw new Error("Outbound email HTML must include an unsubscribe link.");
  }

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
    console.info("[email:dev]", {
      to: input.toEmail,
      subject: input.subject,
      replyTo: input.replyTo ?? replyToAddress(),
      attachments: input.attachments?.map((a) => a.filename) ?? [],
    });
    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    return { id: message.id, simulated: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Bizcon RSVP <invites@bizconrsvp.com>";
  const result = await resend.emails.send({
    from,
    to: input.toEmail,
    replyTo: input.replyTo ?? replyToAddress(),
    subject: input.subject,
    html: input.html,
    headers: buildListUnsubscribeHeaders(input.toEmail),
    attachments: input.attachments?.map((file) => ({
      filename: file.filename,
      content: file.content,
      contentType: file.contentType ?? "application/pdf",
    })),
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

function truncateText(value: string, max = 220) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

async function resolveEventMailContext(
  organisationId: string,
  eventId: string | undefined,
  partial: Partial<EventMailContext> & {
    eventName?: string;
    orgName?: string;
  },
): Promise<EventMailContext> {
  let loaded: {
    name: string;
    venue: string | null;
    timezone: string;
    startsAt: Date | null;
    endsAt: Date | null;
    description: string | null;
    organisation: { name: string };
  } | null = null;

  if (eventId) {
    loaded = await prisma.event.findFirst({
      where: { id: eventId, organisationId },
      select: {
        name: true,
        venue: true,
        timezone: true,
        startsAt: true,
        endsAt: true,
        description: true,
        organisation: { select: { name: true } },
      },
    });
  }

  return {
    eventName: partial.eventName ?? loaded?.name ?? "your event",
    orgName: partial.orgName ?? loaded?.organisation.name ?? "the organiser",
    venue: partial.venue !== undefined ? partial.venue : (loaded?.venue ?? null),
    timezone: partial.timezone ?? loaded?.timezone ?? "UTC",
    startsAt:
      partial.startsAt !== undefined ? partial.startsAt : (loaded?.startsAt ?? null),
    endsAt: partial.endsAt !== undefined ? partial.endsAt : (loaded?.endsAt ?? null),
    description:
      partial.description !== undefined
        ? partial.description
        : (loaded?.description ?? null),
  };
}

function eventFactsBlock(ctx: EventMailContext) {
  const when = formatEventWindow(ctx.startsAt, ctx.endsAt, ctx.timezone);
  const where = ctx.venue?.trim() || "Location to be confirmed";
  const rows = [
    ["Host", ctx.orgName],
    ["When", when],
    ["Where", where],
  ];

  return `<div style="margin:0 0 16px;padding:14px 16px;border-radius:12px;border:1px solid ${aurora.border};background:${aurora.canvas}">
    ${rows
      .map(
        ([label, value]) =>
          `<p style="margin:0 0 8px;font-size:13px;line-height:1.45;color:${aurora.body}"><span style="display:inline-block;min-width:48px;font-weight:600;color:${aurora.text}">${escapeHtml(label)}</span> ${escapeHtml(value)}</p>`,
      )
      .join("")}
  </div>`;
}

function purposeParagraph(ctx: EventMailContext, fallback: string) {
  const fromEvent = ctx.description?.trim();
  const text = fromEvent ? truncateText(fromEvent) : fallback;
  return p(escapeHtml(text));
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
  venue?: string | null;
  timezone?: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  description?: string | null;
}) {
  const ctx = await resolveEventMailContext(input.organisationId, input.eventId, input);
  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    invitationId: input.invitationId,
    toEmail: input.toEmail,
    subject: `${ctx.orgName} invites you to ${ctx.eventName}`,
    html: letter({
      title: ctx.eventName,
      eyebrow: "You're invited to attend",
      orgName: ctx.orgName,
      toEmail: input.toEmail,
      href: input.acceptUrl,
      cta: "View your invitation",
      body: `${p(`Hello ${escapeHtml(input.toName)},`)}
        ${p(`${escapeHtml(ctx.orgName)} is pleased to invite you to attend <strong style="color:${aurora.text}">${escapeHtml(ctx.eventName)}</strong>.`)}
        ${purposeParagraph(
          ctx,
          "Please use the secure link below to view your invitation and confirm whether you can attend.",
        )}
        ${eventFactsBlock(ctx)}
        ${p("Your invitation link is unique to you — please do not forward this email.", true)}`,
    }),
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
  /** Desk check-in token for the A4 welcome PDF attachment. */
  attendanceToken: string;
  company?: string | null;
  categoryName?: string | null;
  venue?: string | null;
  timezone?: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  description?: string | null;
}) {
  const ctx = await resolveEventMailContext(input.organisationId, input.eventId, input);

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
            timeZone: ctx.timezone,
          })}${
            session.endsAt
              ? `–${session.endsAt.toLocaleString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: ctx.timezone,
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

  const welcomePack = await buildWelcomePackPdf({
    eventName: ctx.eventName,
    orgName: ctx.orgName,
    attendeeName: input.toName,
    company: input.company ?? null,
    categoryName: input.categoryName ?? null,
    venue: ctx.venue,
    timezone: ctx.timezone,
    startsAt: ctx.startsAt,
    endsAt: ctx.endsAt,
    attendanceToken: input.attendanceToken,
  });

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject: `Registration confirmed — ${ctx.eventName}`,
    html: letter({
      title: `Your place at ${ctx.eventName} is confirmed`,
      eyebrow: "Registration",
      orgName: ctx.orgName,
      toEmail: input.toEmail,
      href: input.signUpUrl,
      cta: "Create your account",
      body: `${p(`Hello ${escapeHtml(input.toName)},`)}
        ${p(`${escapeHtml(ctx.orgName)} has recorded your registration for <strong style="color:${aurora.text}">${escapeHtml(ctx.eventName)}</strong>.`)}
        ${purposeParagraph(
          ctx,
          "Create an account with the same email to open the event app, request meetings, and access your check-in QR on the day.",
        )}
        ${eventFactsBlock(ctx)}
        ${p(`Use <strong style="color:${aurora.text}">${escapeHtml(input.toEmail)}</strong> when you create your account.`)}
        ${p(`<strong style="color:${aurora.text}">Attached:</strong> an A4 welcome sheet with your personal check-in QR. Print it if you will not have a phone at registration.`)}
        <ul style="margin:0 0 12px;padding-left:18px;color:${aurora.body};font-size:14px;line-height:1.6">
          <li>Meetings and connection requests</li>
          <li>Agenda and online sessions</li>
          <li>Matchmaking directory</li>
          <li>Check-in QR in the app or on the attached PDF</li>
        </ul>
        ${sessionBlocks}
        ${p("After signing up, complete your matching profile so the directory can introduce the right people.", true)}`,
    }),
    attachments: [
      {
        filename: welcomePack.filename,
        content: Buffer.from(welcomePack.bytes),
        contentType: "application/pdf",
      },
    ],
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
    html: letter({
      title: "Your organiser workspace is ready",
      eyebrow: "Welcome",
      orgName: input.orgName,
      toEmail: input.toEmail,
      href: input.loginUrl,
      cta: "Open organiser console",
      body: `${p(`Hello ${escapeHtml(input.toName)},`)}
        ${p(`<strong style="color:${aurora.text}">${escapeHtml(input.orgName)}</strong> is set up on Bizcon RSVP.`)}
        ${p("Use the organiser console to manage invitations, registration, meetings, check-in, and event communications for your professional events.")}
        ${p(`Sign in with <strong style="color:${aurora.text}">${escapeHtml(input.toEmail)}</strong> to get started.`, true)}`,
    }),
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
  orgName?: string;
}) {
  const ctx = await resolveEventMailContext(input.organisationId, input.eventId, {
    eventName: input.eventName,
    orgName: input.orgName,
  });

  const details = [
    input.requesterCompany
      ? `<strong style="color:${aurora.text}">${escapeHtml(input.requesterCompany)}</strong>`
      : null,
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
    subject: `${input.requesterName} would like to meet at ${ctx.eventName}`,
    html: letterPair({
      title: `${input.requesterName} sent a connection request`,
      eyebrow: "Connection request",
      orgName: ctx.orgName,
      toEmail: input.toEmail,
      primaryHref: input.acceptUrl,
      primaryCta: "Accept request",
      secondaryHref: input.declineUrl,
      secondaryCta: "Decline request",
      body: `${p(`Hello ${escapeHtml(input.toName)},`)}
        ${p(`${escapeHtml(input.requesterName)} would like to meet with you at <strong style="color:${aurora.text}">${escapeHtml(ctx.eventName)}</strong>, hosted by ${escapeHtml(ctx.orgName)}.`)}
        ${details ? `<p style="margin:0 0 12px;color:${aurora.body};font-size:14px">${details}</p>` : ""}
        ${quote}
        ${eventFactsBlock(ctx)}
        ${p("Accepting will create a meeting you can reschedule in the event app.", true)}`,
    }),
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
  kind: "invitation" | "registration" | "event";
}) {
  const ctx = await resolveEventMailContext(input.organisationId, input.eventId, input);

  const copy =
    input.kind === "invitation"
      ? {
          subject: `Reminder: your invitation to ${ctx.eventName}`,
          title: `Please respond to ${ctx.eventName}`,
          eyebrow: "Invitation reminder",
          lead: `${escapeHtml(ctx.orgName)} is still waiting for your response to this invitation.`,
          cta: "Open invitation",
          purpose:
            "Use your unique invitation link to view details and confirm whether you can attend.",
        }
      : input.kind === "event"
        ? {
            subject: `${ctx.eventName} starts soon`,
            title: `${ctx.eventName} is coming up`,
            eyebrow: "Event reminder",
            lead: `${escapeHtml(ctx.orgName)} is looking forward to welcoming you.`,
            cta: "Open event app",
            purpose:
              "Review the agenda, meetings, and your check-in QR before you arrive.",
          }
        : {
            subject: `Reminder: complete registration for ${ctx.eventName}`,
            title: `Please complete registration for ${ctx.eventName}`,
            eyebrow: "Registration reminder",
            lead: `${escapeHtml(ctx.orgName)} is waiting for you to finish registration.`,
            cta: "Complete registration",
            purpose:
              "Complete registration so your place is confirmed and you can access the event app.",
          };

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    invitationId: input.invitationId,
    toEmail: input.toEmail,
    subject: copy.subject,
    html: letter({
      title: copy.title,
      eyebrow: copy.eyebrow,
      orgName: ctx.orgName,
      toEmail: input.toEmail,
      href: input.href,
      cta: copy.cta,
      body: `${p(`Hello ${escapeHtml(input.toName)},`)}
        ${p(copy.lead)}
        ${purposeParagraph(ctx, copy.purpose)}
        ${eventFactsBlock(ctx)}`,
    }),
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
  const ctx = await resolveEventMailContext(input.organisationId, input.eventId, input);
  const changed = Boolean(input.previousRoleLabel);
  const subject = changed
    ? `Your role at ${ctx.eventName} is now ${input.roleLabel}`
    : `You've been assigned as ${input.roleLabel} for ${ctx.eventName}`;

  const body = changed
    ? `${p(`Hello ${escapeHtml(input.toName)},`)}
       ${p(`Your staff role for <strong style="color:${aurora.text}">${escapeHtml(ctx.eventName)}</strong> (hosted by ${escapeHtml(ctx.orgName)}) has been updated from ${escapeHtml(input.previousRoleLabel!)} to <strong style="color:${aurora.text}">${escapeHtml(input.roleLabel)}</strong>.`)}
       ${p(`${escapeHtml(input.roleDescription)}.`)}
       ${eventFactsBlock(ctx)}
       ${p(`Sign in with <strong style="color:${aurora.text}">${escapeHtml(input.toEmail)}</strong> to open your workspace.`, true)}`
    : `${p(`Hello ${escapeHtml(input.toName)},`)}
       ${p(`${escapeHtml(ctx.orgName)} has assigned you as <strong style="color:${aurora.text}">${escapeHtml(input.roleLabel)}</strong> for <strong style="color:${aurora.text}">${escapeHtml(ctx.eventName)}</strong>.`)}
       ${p(`${escapeHtml(input.roleDescription)}.`)}
       ${eventFactsBlock(ctx)}
       ${p(`Sign in with <strong style="color:${aurora.text}">${escapeHtml(input.toEmail)}</strong> to open your workspace.`, true)}`;

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject,
    html: letter({
      title: changed ? "Your staff role has been updated" : "You have a new staff role",
      eyebrow: "Staff access",
      orgName: ctx.orgName,
      toEmail: input.toEmail,
      href: input.workspaceUrl,
      cta: "Open workspace",
      body,
    }),
  });
}

export async function sendMeetingReminderEmail(input: {
  organisationId: string;
  eventId: string;
  toEmail: string;
  toName: string;
  eventName: string;
  when: string;
  room: string | null;
  href: string;
  kind: "24h" | "30min";
  orgName?: string;
}) {
  const ctx = await resolveEventMailContext(input.organisationId, input.eventId, {
    eventName: input.eventName,
    orgName: input.orgName,
  });
  const subject =
    input.kind === "30min"
      ? `Meeting in 30 minutes — ${ctx.eventName}`
      : `Meeting tomorrow — ${ctx.eventName}`;
  const roomLine = input.room
    ? `<p style="margin:0 0 12px;color:${aurora.body};font-size:14px"><strong style="color:${aurora.text}">Room:</strong> ${escapeHtml(input.room)}</p>`
    : "";

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject,
    html: letter({
      title: subject,
      eyebrow: "Meeting reminder",
      orgName: ctx.orgName,
      toEmail: input.toEmail,
      href: input.href,
      cta: "View meeting",
      body: `${p(`Hello ${escapeHtml(input.toName)},`)}
        ${p(`Your meeting at <strong style="color:${aurora.text}">${escapeHtml(ctx.eventName)}</strong> (hosted by ${escapeHtml(ctx.orgName)}) is scheduled for <strong style="color:${aurora.text}">${escapeHtml(input.when)}</strong>.`)}
        ${roomLine}
        ${eventFactsBlock(ctx)}
        ${p("Open the event app to view details or reschedule if needed.", true)}`,
    }),
  });
}

export async function sendUnscheduledMeetingNudgeEmail(input: {
  organisationId: string;
  eventId: string;
  toEmail: string;
  toName: string;
  eventName: string;
  href: string;
  orgName?: string;
}) {
  const ctx = await resolveEventMailContext(input.organisationId, input.eventId, {
    eventName: input.eventName,
    orgName: input.orgName,
  });

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject: `Unscheduled meeting — ${ctx.eventName}`,
    html: letter({
      title: "Your meeting needs a time slot",
      eyebrow: "Scheduling",
      orgName: ctx.orgName,
      toEmail: input.toEmail,
      href: input.href,
      cta: "View meetings",
      body: `${p(`Hello ${escapeHtml(input.toName)},`)}
        ${p(`You have an accepted meeting at <strong style="color:${aurora.text}">${escapeHtml(ctx.eventName)}</strong> that has not been placed on the schedule yet.`)}
        ${eventFactsBlock(ctx)}
        ${p(`${escapeHtml(ctx.orgName)} is working on room assignments — check the event app soon for an update.`, true)}`,
    }),
  });
}

export async function sendPostMeetingFollowUpEmail(input: {
  organisationId: string;
  eventId: string;
  toEmail: string;
  toName: string;
  eventName: string;
  href: string;
  orgName?: string;
}) {
  const ctx = await resolveEventMailContext(input.organisationId, input.eventId, {
    eventName: input.eventName,
    orgName: input.orgName,
  });

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject: `How was your meeting at ${ctx.eventName}?`,
    html: letter({
      title: "Share quick feedback",
      eyebrow: "Follow-up",
      orgName: ctx.orgName,
      toEmail: input.toEmail,
      href: input.href,
      cta: "Open poll",
      body: `${p(`Hello ${escapeHtml(input.toName)},`)}
        ${p(`We hope your meeting at <strong style="color:${aurora.text}">${escapeHtml(ctx.eventName)}</strong> went well.`)}
        ${p(`${escapeHtml(ctx.orgName)} would value optional feedback via a short poll — it helps improve future sessions.`)}
        ${eventFactsBlock(ctx)}`,
    }),
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
  orgName?: string;
}) {
  const ctx = await resolveEventMailContext(input.organisationId, input.eventId, {
    eventName: input.eventName,
    orgName: input.orgName,
  });

  return deliver({
    organisationId: input.organisationId,
    eventId: input.eventId,
    toEmail: input.toEmail,
    subject: input.approved
      ? `Application approved — ${ctx.eventName}`
      : `Application update — ${ctx.eventName}`,
    html: letter({
      title: input.approved
        ? `You have been invited to ${ctx.eventName}`
        : `Update on your application to ${ctx.eventName}`,
      eyebrow: "Application",
      orgName: ctx.orgName,
      toEmail: input.toEmail,
      href: input.approved ? input.href : undefined,
      cta: input.approved ? "View invitation" : undefined,
      body: input.approved
        ? `${p(`Hello ${escapeHtml(input.toName)},`)}
           ${p(`${escapeHtml(ctx.orgName)} has approved your application to <strong style="color:${aurora.text}">${escapeHtml(ctx.eventName)}</strong>.`)}
           ${purposeParagraph(
             ctx,
             "Use the unique invitation link below to accept and then complete registration.",
           )}
           ${eventFactsBlock(ctx)}
           ${p("Your invitation link is unique to you — please do not forward this email.", true)}`
        : `${p(`Hello ${escapeHtml(input.toName)},`)}
           ${p(`${escapeHtml(ctx.orgName)} has reviewed your application to <strong style="color:${aurora.text}">${escapeHtml(ctx.eventName)}</strong> and is unable to offer a place at this time.`)}
           ${eventFactsBlock(ctx)}
           ${p("If you believe this was sent in error, reply to this email or contact support.", true)}`,
    }),
  });
}
