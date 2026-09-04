import Link from "next/link";
import { IdCard, Lock, QrCode } from "lucide-react";
import { Card } from "@/components/ui/card";
import { QrCodeImage } from "@/components/qr-code";
import { BadgeCard } from "@/components/badges/badge-card";
import { BadgePreviewFrame } from "@/components/badges/badge-preview-frame";
import { getMyDigitalBadge } from "@/modules/attendees/digital-badge";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";

export const dynamic = "force-dynamic";

export default async function AttendeeDigitalBadgePage({
  params,
}: PageProps<"/me/events/[eventId]/badge">) {
  const { eventId } = await params;
  await safe(() => requireUser());
  const digital = await safe(() => getMyDigitalBadge(eventId));

  if (!digital.unlocked) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="font-display text-4xl text-slate-900">My badge</h1>
          <p className="mt-2 text-slate-600">{digital.eventName}</p>
        </div>
        <Card className="space-y-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <Lock className="size-5" strokeWidth={1.75} aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Available after check-in
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Your digital entrance badge unlocks once desk staff have checked you
            in. Until then, use your check-in QR at registration.
          </p>
          <Link
            href={digital.checkInQrHref}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <QrCode className="size-4" strokeWidth={1.75} aria-hidden />
            Show check-in QR
          </Link>
        </Card>
      </div>
    );
  }

  const { badge, printNumber, checkedInAt, eventName } = digital;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Entrance pass
        </p>
        <h1 className="mt-1 font-display text-4xl text-slate-900">My badge</h1>
        <p className="mt-2 text-slate-600">{eventName}</p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <IdCard className="size-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-semibold text-slate-900">
              {badge.firstName} {badge.lastName}
            </p>
            <p className="text-sm text-slate-600">
              {[badge.jobTitle, badge.company].filter(Boolean).join(" · ") ||
                "—"}
            </p>
            {badge.categoryName ? (
              <p className="mt-1 text-sm font-medium text-indigo-700">
                {badge.categoryName}
              </p>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Checked in {checkedInAt.toLocaleString()} · Badge #{printNumber}
        </p>
      </Card>

      <Card className="flex flex-col items-center space-y-3">
        <p className="text-center text-sm font-medium text-slate-700">
          Show this code at the entrance
        </p>
        <QrCodeImage
          dataUrl={badge.qrDataUrl}
          label="Entrance badge code"
          showLabel={false}
        />
        <p className="max-w-xs text-center text-xs text-slate-500">
          This is your entrance credential — different from the desk check-in
          QR. Keep your screen brightness up and do not share screenshots.
        </p>
      </Card>

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">Badge preview</p>
        <div className="flex justify-center rounded-xl bg-slate-100 p-4">
          <BadgePreviewFrame template={badge.template} scale={undefined}>
            <BadgeCard badge={badge} />
          </BadgePreviewFrame>
        </div>
      </div>

      <p className="text-center text-sm text-slate-500">
        Still need desk check-in?{" "}
        <Link
          href={`/me/events/${eventId}/qr`}
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Open check-in QR
        </Link>
      </p>
    </div>
  );
}
