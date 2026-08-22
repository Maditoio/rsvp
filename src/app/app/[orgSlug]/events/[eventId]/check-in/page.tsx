import { redirect } from "next/navigation";

export default async function LegacyCheckInPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/check-in">) {
  const { orgSlug, eventId } = await params;
  redirect(`/app/${orgSlug}/events/${eventId}/day`);
}
