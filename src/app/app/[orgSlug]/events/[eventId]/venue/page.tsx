import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { PageHeader } from "@/components/ui/page-header";
import { VenueOrganiserPanel } from "@/components/venue/venue-organiser-panel";

export default async function EventVenuePage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.update"));

  const [floorPlan, rooms, sessions] = await Promise.all([
    prisma.venueFloorPlan.findFirst({
      where: { eventId, organisationId: ctx.organisation.id },
      orderBy: [{ floorIndex: "asc" }, { createdAt: "asc" }],
      include: {
        pois: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        checkpoints: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.meetingRoom.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.session.findMany({
      where: { eventId, organisationId: ctx.organisation.id },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Venue"
        title="Floor plan & navigation"
        description="Upload a venue map, place locations, and print QR checkpoints so guests can find their way."
      />
      <VenueOrganiserPanel
        orgSlug={orgSlug}
        eventId={eventId}
        aiFloorPlanEnabled={ctx.organisation.venueAiFloorPlanEnabled}
        rooms={rooms}
        sessions={sessions}
        floorPlan={
          floorPlan
            ? {
                id: floorPlan.id,
                name: floorPlan.name,
                imageUrl: floorPlan.imageUrl,
                publishedAt: floorPlan.publishedAt?.toISOString() ?? null,
                pois: floorPlan.pois.map((p) => ({
                  id: p.id,
                  name: p.name,
                  category: p.category,
                  description: p.description,
                  x: p.x,
                  y: p.y,
                  meetingRoomId: p.meetingRoomId,
                  sessionId: p.sessionId,
                })),
                checkpoints: floorPlan.checkpoints.map((c) => ({
                  id: c.id,
                  label: c.label,
                  poiId: c.poiId,
                  active: c.active,
                })),
              }
            : null
        }
      />
    </div>
  );
}
