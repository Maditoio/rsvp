import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { resolveVenueCheckpoint } from "@/modules/venue/attendee-actions";
import { hasClerk } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export default async function VenueCheckpointPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (hasClerk()) {
    const session = await auth();
    if (!session.userId) {
      redirect(`/sign-in?redirect_url=${encodeURIComponent(`/v/${token}`)}`);
    }
  }

  const result = await resolveVenueCheckpoint(token);
  if (result.ok) {
    const dest = result.data.poiId
      ? `/me/events/${result.data.eventId}/map?here=${result.data.poiId}`
      : `/me/events/${result.data.eventId}/map`;
    redirect(dest);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <Card className="max-w-md p-8">
        <h1 className="text-xl font-semibold text-slate-900">Venue QR</h1>
        <p className="mt-3 text-sm text-slate-600">{result.error}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/sign-in"
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
          <Link
            href="/home"
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Home
          </Link>
        </div>
      </Card>
    </div>
  );
}
