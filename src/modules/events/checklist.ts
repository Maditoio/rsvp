import "server-only";

import { prisma } from "@/lib/db/prisma";
import type {
  ChecklistItem,
  ChecklistResult,
} from "./checklist-types";

export type {
  ChecklistItem,
  ChecklistPhase,
  ChecklistResult,
} from "./checklist-types";

export { CHECKLIST_PHASES } from "./checklist-types";

export async function getEventChecklist(
  organisationId: string,
  orgSlug: string,
  eventId: string,
): Promise<ChecklistResult> {
  const base = `/app/${orgSlug}/events/${eventId}`;

  const [
    event,
    contactCount,
    invitationSent,
    sessionCount,
    roomCount,
    formFieldCount,
    categoryCount,
    pollCount,
  ] = await Promise.all([
    prisma.event.findFirst({
      where: { id: eventId, organisationId },
      select: {
        venue: true,
        startsAt: true,
        description: true,
        settings: {
          select: {
            allowPublicApplication: true,
            aiInsightsEnabled: true,
            websitePublishedAt: true,
          },
        },
      },
    }),
    prisma.contact.count({ where: { eventId, organisationId } }),
    prisma.invitation.count({
      where: {
        eventId,
        organisationId,
        status: {
          in: ["SENT", "DELIVERED", "OPENED", "ACCEPTED", "DECLINED"],
        },
      },
    }),
    prisma.session.count({ where: { eventId, organisationId } }),
    prisma.meetingRoom.count({ where: { eventId, organisationId } }),
    prisma.registrationField.count({ where: { eventId, organisationId } }),
    prisma.invitationCategory.count({ where: { eventId, organisationId } }),
    prisma.eventPoll.count({ where: { eventId, organisationId } }),
  ]);

  const items: ChecklistItem[] = [
    {
      id: "event_details",
      phase: "customize",
      title: "Event details",
      description:
        "Add venue, dates, and a short description for organisers and guests.",
      href: `${base}/edit`,
      complete: Boolean(event?.venue && event?.startsAt),
    },
    {
      id: "registration_form",
      phase: "customize",
      title: "Form builder",
      description: "Customize registration questions and required fields.",
      href: `${base}/registration-form`,
      complete: formFieldCount > 0,
    },
    {
      id: "invite_list",
      phase: "customize",
      title: "Invite list",
      description:
        "Add invitees to receive email invitations, or import a spreadsheet.",
      href: `${base}/invitees`,
      optional: true,
      complete: contactCount > 0,
    },
    {
      id: "event_website",
      phase: "customize",
      title: "Event website",
      description: "Publish a marketing page with agenda, speakers, and registration CTA.",
      href: `${base}/website`,
      optional: true,
      complete: Boolean(event?.settings?.websitePublishedAt),
    },
    {
      id: "public_apply",
      phase: "customize",
      title: "Public applications",
      description: "Allow guests to apply without a personal invitation.",
      href: `${base}/settings`,
      optional: true,
      complete: event?.settings?.allowPublicApplication === true,
    },
    {
      id: "communications",
      phase: "customize",
      title: "Confirmation emails and reminders",
      description: "Review invitation and confirmation messaging.",
      href: `${base}/communications`,
      complete: false,
      optional: true,
    },
    {
      id: "categories",
      phase: "launch",
      title: "Invitation categories",
      description: "Define categories such as VIP, speaker, or delegate.",
      href: `${base}/categories`,
      complete: categoryCount > 0,
    },
    {
      id: "send_invites",
      phase: "launch",
      title: "Send invitations",
      description: "Issue invitation emails to people on your invite list.",
      href: `${base}/invitations`,
      complete: invitationSent > 0,
    },
    {
      id: "applications_review",
      phase: "launch",
      title: "Review applications",
      description: "Approve or decline open applications when enabled.",
      href: `${base}/applications`,
      optional: true,
      complete: event?.settings?.allowPublicApplication === true,
    },
    {
      id: "agenda",
      phase: "organize",
      title: "Agenda and sessions",
      description: "Publish the programme guests will follow on event days.",
      href: `${base}/agenda`,
      optional: true,
      complete: sessionCount > 0,
    },
    {
      id: "meeting_rooms",
      phase: "organize",
      title: "Meeting rooms",
      description: "Add rooms so networking meetings can be scheduled.",
      href: `${base}/meetings`,
      optional: true,
      complete: roomCount > 0,
    },
    {
      id: "matchmaking",
      phase: "organize",
      title: "Matchmaking settings",
      description: "Enable AI insights and review networking options.",
      href: `${base}/settings`,
      optional: true,
      complete: event?.settings?.aiInsightsEnabled === true,
    },
    {
      id: "polls",
      phase: "follow_up",
      title: "Attendee polls",
      description: "Collect feedback with Con·cierge AI–assisted polls.",
      href: `${base}/polls`,
      optional: true,
      complete: pollCount > 0,
    },
    {
      id: "check_in",
      phase: "follow_up",
      title: "Check-in readiness",
      description: "Confirm staff access and QR check-in before doors open.",
      href: `${base}/check-in`,
      complete: false,
      optional: true,
    },
    {
      id: "reports",
      phase: "follow_up",
      title: "Reports",
      description: "Export invitees, attendees, and registration data.",
      href: `${base}/reports`,
      complete: true,
      optional: true,
    },
  ];

  const completed = items.filter((i) => i.complete).length;
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { items, completed, total, percent };
}
