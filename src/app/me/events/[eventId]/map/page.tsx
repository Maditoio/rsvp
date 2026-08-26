import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { AuthzError } from "@/lib/db/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { AttendeeVenueMap } from "@/components/venue/attendee-venue-map";
import Link from "next/link";

export default async function AttendeeMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const user = await safe(() => requireUser());

  const attendee = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: {
      event: { select: { name: true } },
      mapLocation: {
        include: { poi: { select: { id: true, name: true } } },
      },
    },
  });
  if (!attendee) {
    await safe(async () => {
      throw new AuthzError("You are not registered for this event", 403);
    });
    return null;
  }

  const floorPlans = await prisma.venueFloorPlan.findMany({
    where: {
      eventId,
      organisationId: attendee.organisationId,
      publishedAt: { not: null },
    },
    orderBy: [{ floorIndex: "asc" }, { createdAt: "asc" }],
    include: {
      pois: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });

  if (floorPlans.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow={attendee.event.name}
          title="Venue map"
          description="The organiser has not published a floor plan for this event yet."
          className="gap-2 sm:gap-2"
        />
        <Link
          href={`/me/events/${eventId}`}
          className="text-sm font-semibold text-indigo-600"
        >
          Back to event
        </Link>
      </div>
    );
  }

  const allPois = floorPlans.flatMap((f) =>
    f.pois.map((p) => ({ ...p, floorPlanId: f.id })),
  );

  let destinationId: string | null =
    typeof query.to === "string" ? query.to : null;
  if (!destinationId && typeof query.session === "string") {
    const linked = allPois.find((p) => p.sessionId === query.session);
    destinationId = linked?.id ?? null;
  }
  if (!destinationId && typeof query.room === "string") {
    const linked = allPois.find((p) => p.meetingRoomId === query.room);
    destinationId = linked?.id ?? null;
  }

  const herePoiId =
    (typeof query.here === "string" ? query.here : null) ??
    attendee.mapLocation?.poiId ??
    null;
  const herePoi = herePoiId
    ? allPois.find((p) => p.id === herePoiId)
    : null;
  const destinationPoi = destinationId
    ? allPois.find((p) => p.id === destinationId)
    : null;

  const initialFloorId =
    (typeof query.floor === "string"
      ? floorPlans.find((f) => f.id === query.floor)?.id
      : null) ??
    destinationPoi?.floorPlanId ??
    herePoi?.floorPlanId ??
    attendee.mapLocation?.floorPlanId ??
    floorPlans[0]!.id;

  const hereLabel =
    herePoi?.name ?? attendee.mapLocation?.poi?.name ?? null;

  return (
    <AttendeeVenueMap
      eventId={eventId}
      eventName={attendee.event.name}
      initialFloorId={initialFloorId}
      youAreHereId={herePoiId}
      youAreHereLabel={hereLabel}
      youAreHereAt={attendee.mapLocation?.updatedAt.toISOString() ?? null}
      initialDestinationId={destinationId}
      floors={floorPlans.map((floorPlan) => ({
        id: floorPlan.id,
        name: floorPlan.name,
        imageUrl: floorPlan.imageUrl,
        pois: floorPlan.pois.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          x: p.x,
          y: p.y,
        })),
      }))}
    />
  );
}
