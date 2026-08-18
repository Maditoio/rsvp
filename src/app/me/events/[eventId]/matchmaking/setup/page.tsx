import { redirect } from "next/navigation";

export default async function MatchmakingSetupRedirect({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/me/events/${eventId}/matchmaking`);
}
