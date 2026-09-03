import Link from "next/link";
import { Card } from "@/components/ui/card";
import { QrCodeImage } from "@/components/qr-code";
import { getMyAttendanceQrDataUrl } from "@/modules/attendees/actions";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";

export const dynamic = "force-dynamic";

export default async function AttendeeQrPage({
  params,
}: PageProps<"/me/events/[eventId]/qr">) {
  const { eventId } = await params;
  await safe(() => requireUser());
  const dataUrl = await safe(() => getMyAttendanceQrDataUrl(eventId));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-slate-900">Check-in QR</h1>
      <p className="max-w-lg text-slate-700">
        Present this code to desk check-in staff. After you are checked in, open{" "}
        <Link
          href={`/me/events/${eventId}/badge`}
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          My badge
        </Link>{" "}
        for your entrance pass on this phone.
      </p>
      <Card className="flex flex-col items-center">
        <QrCodeImage dataUrl={dataUrl} label="Opaque attendance check-in code" />
        <p className="mt-4 text-sm text-slate-500">
          Owner-only. Do not share screenshots widely.
        </p>
      </Card>
    </div>
  );
}
