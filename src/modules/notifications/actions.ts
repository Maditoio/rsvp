"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz/require";
import {
  type ActionResult,
  actionFail,
  actionOk,
  publicActionError,
} from "@/lib/action-result";
import { loadAttendeeInbox, type AttendeeInbox } from "@/modules/notifications/attendee-inbox";
import {
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsRead,
} from "@/modules/notifications/service";

export async function fetchAttendeeInbox(
  eventId?: string,
): Promise<ActionResult<AttendeeInbox>> {
  try {
    const inbox = await loadAttendeeInbox(eventId);
    return actionOk(inbox);
  } catch (error) {
    return actionFail(publicActionError(error, "Could not load notifications."));
  }
}

export async function markInboxNotificationRead(
  notificationId: string,
  eventId?: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markNotificationRead(notificationId, user.id);
    if (eventId) revalidatePath(`/me/events/${eventId}/meetings`);
    revalidatePath("/me");
    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not update notification."));
  }
}

export async function markInboxNotificationsViewed(
  notificationIds: string[],
  eventId?: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markNotificationsRead(notificationIds, user.id);
    if (eventId) revalidatePath(`/me/events/${eventId}/meetings`);
    revalidatePath("/me");
    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not update notifications."));
  }
}

export async function markAllInboxNotificationsRead(
  eventId?: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await markAllNotificationsRead({ userId: user.id, eventId });
    if (eventId) revalidatePath(`/me/events/${eventId}/meetings`);
    revalidatePath("/me");
    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not update notifications."));
  }
}
