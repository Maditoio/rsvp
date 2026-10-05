import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/card";
import { PublicEventHero } from "@/components/public/public-event-branding";
import { formatEventWindow, turnstileSiteKey } from "@/lib/utils";
import { loadPublicEventBrandingBySlugs } from "@/modules/branding/public-event-branding";
import { PublicApplyForm } from "./apply-form";

export default async function PublicApplyPage({
  params,
}: PageProps<"/a/[orgSlug]/[eventSlug]">) {
  const { orgSlug, eventSlug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug: eventSlug, organisation: { slug: orgSlug } },
    include: { settings: true, organisation: { select: { name: true } } },
  });
  if (!event?.settings?.allowPublicApplication) notFound();

  const branding =
    (await loadPublicEventBrandingBySlugs({ orgSlug, eventSlug })) ?? {
      logoUrl: null,
      bannerUrl: null,
      accentColor: "#4F46E5",
      accentSoft: "#EEF2FF",
      accentBorder: "#C7D2FE",
      accentShadow: "0 4px 12px rgba(79,70,229,0.28)",
      eventName: event.name,
      orgName: event.organisation.name,
      venue: event.venue,
      timezone: event.timezone,
    };

  return (
    <div
      className="-mx-6 -my-8 min-h-[calc(100vh-8rem)] space-y-6 px-6 py-8"
      style={
        branding.accentColor.toUpperCase() === "#4F46E5"
          ? undefined
          : { backgroundColor: branding.accentSoft }
      }
    >
      <PublicEventHero
        branding={branding}
        eyebrow={event.organisation.name}
        title={event.name}
        description={
          <>
            {event.venue || "Venue TBC"} ·{" "}
            {formatEventWindow(event.startsAt, event.endsAt, event.timezone)}
          </>
        }
      />
      <Card>
        <p className="text-sm text-slate-700">
          Apply to be considered. An approved application becomes an invitation.
          It does not register you for the event.
        </p>
        <div className="mt-6">
          <PublicApplyForm
            orgSlug={orgSlug}
            eventSlug={eventSlug}
            siteKey={turnstileSiteKey()}
            accentColor={branding.accentColor}
          />
        </div>
      </Card>
    </div>
  );
}
