"use server";

import { revalidatePath } from "next/cache";
import { requireEvent } from "@/lib/authz/require";
import { runMatchmakingPipeline } from "./batch";

export async function triggerMatchmakingBatch(orgSlug: string, eventId: string) {
  const ctx = await requireEvent(orgSlug, eventId, "event.update");
  const result = await runMatchmakingPipeline(eventId, ctx.organisation.id, {
    userId: ctx.user.id,
  });
  revalidatePath(`/app/${orgSlug}/events/${eventId}/analytics`);
  revalidatePath(`/app/${orgSlug}/events/${eventId}/meetings`);
  return result;
}
