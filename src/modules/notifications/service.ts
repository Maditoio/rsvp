import { prisma } from "@/lib/db/prisma";

export async function createNotification(input: {
  organisationId: string;
  eventId?: string;
  userId: string;
  title: string;
  body: string;
}) {
  return prisma.notification.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      userId: input.userId,
      title: input.title,
      body: input.body,
    },
  });
}

export async function listNotifications(input: {
  userId: string;
  eventId?: string;
  limit?: number;
}) {
  return prisma.notification.findMany({
    where: {
      userId: input.userId,
      ...(input.eventId ? { eventId: input.eventId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 30,
    include: {
      event: { select: { name: true } },
    },
  });
}

export async function countUnreadNotifications(input: {
  userId: string;
  eventId?: string;
}) {
  return prisma.notification.count({
    where: {
      userId: input.userId,
      readAt: null,
      ...(input.eventId ? { eventId: input.eventId } : {}),
    },
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

export async function markNotificationsRead(notificationIds: string[], userId: string) {
  if (notificationIds.length === 0) return;
  await prisma.notification.updateMany({
    where: { id: { in: notificationIds }, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(input: {
  userId: string;
  eventId?: string;
}) {
  await prisma.notification.updateMany({
    where: {
      userId: input.userId,
      readAt: null,
      ...(input.eventId ? { eventId: input.eventId } : {}),
    },
    data: { readAt: new Date() },
  });
}
