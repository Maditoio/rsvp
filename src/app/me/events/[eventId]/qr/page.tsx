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
      <h1 className="font-serif text-4xl text-slate-900">My QR code</h1>
      <p className="max-w-lg text-slate-600">
        This is an opaque attendance token. It does not contain your name,
        email, or company. Present it to check-in staff.
      </p>
      <Card className="flex flex-col items-center">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-200">
          <span className="h-2 w-2 rounded-full bg-accent-600" />
        </div>
        <QrCodeImage dataUrl={dataUrl} />
        <p className="mt-4 text-sm text-slate-500">Owner-only. Do not share screenshots widely.</p>
        <Link
          href={`/me/events/${eventId}`}
          className="mt-6 text-sm text-primary-700 underline"
        >
          Back to event
        </Link>
      </Card>
    </div>
  );
}
