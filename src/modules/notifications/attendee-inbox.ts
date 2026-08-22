import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { displayName } from "@/lib/utils";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/modules/notifications/service";

export type AttendeeInboxNotification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  eventId: string | null;
  eventName: string | null;
};

export type AttendeeInboxRequest = {
  id: string;
  message: string | null;
  createdAt: string;
  requesterName: string;
  requesterCompany: string | null;
};

export type AttendeeInbox = {
  notifications: AttendeeInboxNotification[];
  pendingRequests: AttendeeInboxRequest[];
  unreadNotificationCount: number;
  pendingRequestCount: number;
  badgeCount: number;
};

export async function loadAttendeeInbox(eventId?: string): Promise<AttendeeInbox> {
  const user = await requireUser();

  const attendee =
    eventId != null
      ? await prisma.attendee.findFirst({
          where: { eventId, userId: user.id },
          select: { id: true, organisationId: true },
        })
      : null;

  const [notifications, unreadNotificationCount, pendingRequests] = await Promise.all([
    listNotifications({ userId: user.id, eventId, limit: 20 }),
    countUnreadNotifications({ userId: user.id, eventId }),
    attendee
      ? prisma.meetingRequest.findMany({
          where: {
            eventId,
            organisationId: attendee.organisationId,
            targetId: attendee.id,
            status: "PENDING",
          },
          include: {
            requester: {
              select: { firstName: true, lastName: true, company: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  const pendingRequestCount = pendingRequests.length;
  const badgeCount = unreadNotificationCount + pendingRequestCount;

  return {
    notifications: notifications.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      eventId: row.eventId,
      eventName: row.event?.name ?? null,
    })),
    pendingRequests: pendingRequests.map((row) => ({
      id: row.id,
      message: row.message,
      createdAt: row.createdAt.toISOString(),
      requesterName: displayName(row.requester),
      requesterCompany: row.requester.company,
    })),
    unreadNotificationCount,
    pendingRequestCount,
    badgeCount,
  };
}

export async function countPendingIncomingRequests(eventId: string): Promise<number> {
  const user = await requireUser();
  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    select: { id: true, organisationId: true },
  });
  if (!attendee) return 0;

  return prisma.meetingRequest.count({
    where: {
      eventId,
      organisationId: attendee.organisationId,
      targetId: attendee.id,
      status: "PENDING",
    },
  });
}
