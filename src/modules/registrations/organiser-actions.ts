"use server";

import { revalidatePath } from "next/cache";
import type { AttendeeStatus, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";

type Decision = "confirm" | "cancel";

const CONFIRMABLE_REGISTRATION: RegistrationStatus[] = [
  "COMPLETED",
  "WAITLISTED",
  "CONFIRMED",
];
const CANCELLABLE_REGISTRATION: RegistrationStatus[] = [
  "NOT_STARTED",
  "INCOMPLETE",
  "COMPLETED",
  "CONFIRMED",
  "WAITLISTED",
];

async function applyDecision(
  orgSlug: string,
  eventId: string,
  decision: Decision,
  ids: { registrationId?: string; attendeeId?: string },
) {
  const ctx = await requireEvent(orgSlug, eventId, "registrations.write");

  const registration = ids.registrationId
    ? await prisma.registrationResponse.findFirst({
        where: {
          id: ids.registrationId,
          eventId,
          organisationId: ctx.organisation.id,
        },
        select: { id: true, status: true },
      })
    : null;

  const attendee = ids.attendeeId
    ? await prisma.attendee.findFirst({
        where: {
          id: ids.attendeeId,
          eventId,
          organisationId: ctx.organisation.id,
        },
        select: { id: true, status: true, registrationId: true },
      })
    : registration
      ? await prisma.attendee.findFirst({
          where: {
            registrationId: registration.id,
            eventId,
            organisationId: ctx.organisation.id,
          },
          select: { id: true, status: true, registrationId: true },
        })
      : null;

  const resolvedRegistration =
    registration ??
    (attendee?.registrationId
      ? await prisma.registrationResponse.findFirst({
          where: {
            id: attendee.registrationId,
            eventId,
            organisationId: ctx.organisation.id,
          },
          select: { id: true, status: true },
        })
      : null);

  if (!resolvedRegistration && !attendee) {
    throw new Error("Registration not found");
  }

  if (decision === "confirm") {
    if (
      resolvedRegistration &&
      !CONFIRMABLE_REGISTRATION.includes(resolvedRegistration.status)
    ) {
      throw new Error("This registration cannot be confirmed");
    }
    if (attendee?.status === "CANCELLED") {
      throw new Error("A cancelled attendee cannot be confirmed");
    }
  } else {
    if (
      resolvedRegistration &&
      !CANCELLABLE_REGISTRATION.includes(resolvedRegistration.status)
    ) {
      throw new Error("This registration cannot be cancelled");
    }
    if (attendee?.status === "CHECKED_IN") {
      throw new Error("Cannot cancel a registration after check-in");
    }
  }

  const nextRegistration: RegistrationStatus =
    decision === "confirm" ? "CONFIRMED" : "CANCELLED";
  const nextAttendee: AttendeeStatus =
    decision === "confirm" ? "CONFIRMED" : "CANCELLED";

  await prisma.$transaction(async (tx) => {
    if (resolvedRegistration) {
      await tx.registrationResponse.update({
        where: { id: resolvedRegistration.id },
        data: { status: nextRegistration },
      });
      await tx.attendee.updateMany({
        where: {
          registrationId: resolvedRegistration.id,
          eventId,
          organisationId: ctx.organisation.id,
          status: { not: "CHECKED_IN" },
        },
        data: { status: nextAttendee },
      });
    } else if (attendee) {
      await tx.attendee.update({
        where: { id: attendee.id },
        data: { status: nextAttendee },
      });
    }
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action:
      decision === "confirm" ? "registration.confirm" : "registration.cancel",
    resource: resolvedRegistration ? "registration" : "attendee",
    resourceId: resolvedRegistration?.id ?? attendee?.id,
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/registrations`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/attendees`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}`);
}

export async function confirmRegistration(
  orgSlug: string,
  eventId: string,
  registrationId: string,
) {
  await applyDecision(orgSlug, eventId, "confirm", { registrationId });
}

export async function cancelRegistration(
  orgSlug: string,
  eventId: string,
  registrationId: string,
) {
  await applyDecision(orgSlug, eventId, "cancel", { registrationId });
}

export async function confirmAttendeeRegistration(
  orgSlug: string,
  eventId: string,
  attendeeId: string,
) {
  await applyDecision(orgSlug, eventId, "confirm", { attendeeId });
}

export async function cancelAttendeeRegistration(
  orgSlug: string,
  eventId: string,
  attendeeId: string,
) {
  await applyDecision(orgSlug, eventId, "cancel", { attendeeId });
}

/**
 * Permanently remove an attendee. Checked-in attendees cannot be deleted.
 * Prefer cancel for soft removal; use this to clear cancelled (or unused) records
 * so the related invitee can also be deleted.
 */
export async function deleteAttendee(
  orgSlug: string,
  eventId: string,
  attendeeId: string,
) {
  const ctx = await requireEvent(orgSlug, eventId, "registrations.write");

  const attendee = await prisma.attendee.findFirst({
    where: {
      id: attendeeId,
      eventId,
      organisationId: ctx.organisation.id,
    },
    select: {
      id: true,
      email: true,
      status: true,
      contactId: true,
      registrationId: true,
    },
  });
  if (!attendee) throw new Error("Attendee not found");
  if (attendee.status === "CHECKED_IN") {
    throw new Error("Cannot delete an attendee after check-in.");
  }

  await prisma.$transaction(async (tx) => {
    if (attendee.registrationId) {
      await tx.registrationResponse.updateMany({
        where: {
          id: attendee.registrationId,
          eventId,
          organisationId: ctx.organisation.id,
          status: { not: "CANCELLED" },
        },
        data: { status: "CANCELLED" },
      });
    }
    await tx.attendee.delete({ where: { id: attendee.id } });
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "attendee.delete",
    resource: "attendee",
    resourceId: attendee.id,
    metadata: {
      email: attendee.email,
      previousStatus: attendee.status,
      contactId: attendee.contactId,
    },
  });

  revalidatePath(`/app/${orgSlug}/events/${eventId}/registrations`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/attendees`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/invitees`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}`);
}
