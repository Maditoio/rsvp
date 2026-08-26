import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { PageHeader } from "@/components/ui/page-header";
import { VenueOrganiserPanel } from "@/components/venue/venue-organiser-panel";
import { VenueInsightsPanel } from "@/components/venue/venue-insights-panel";
import {
  VenueSectionTabs,
  venueSectionHref,
  type VenueSectionId,
} from "@/components/venue/venue-section-tabs";
import {
  auditMapInsightsView,
  loadVenueMapInsights,
} from "@/modules/venue/insights";
import { cn } from "@/lib/utils";

const VALID_SECTIONS = new Set<VenueSectionId>(["floors", "insights"]);

function resolveVenueSection(section: string | undefined): VenueSectionId {
  if (section && VALID_SECTIONS.has(section as VenueSectionId)) {
    return section as VenueSectionId;
  }
  return "floors";
}

export default async function EventVenuePage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/events/[eventId]/venue">) {
  const { orgSlug, eventId } = await params;
  const query = await searchParams;
  const activeSection = resolveVenueSection(
    typeof query.section === "string" ? query.section : undefined,
  );

  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.update"));

  const insightsHref = venueSectionHref(orgSlug, eventId, "insights");
  const isInsights = activeSection === "insights";

  const [floorPlans, rooms, sessions, insights] = await Promise.all([
    isInsights
      ? Promise.resolve([])
      : prisma.venueFloorPlan.findMany({
          where: { eventId, organisationId: ctx.organisation.id },
          orderBy: [{ floorIndex: "asc" }, { createdAt: "asc" }],
          include: {
            pois: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
            checkpoints: { orderBy: { createdAt: "desc" } },
          },
        }),
    isInsights
      ? Promise.resolve([])
      : prisma.meetingRoom.findMany({
          where: { eventId, organisationId: ctx.organisation.id },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
    isInsights
      ? Promise.resolve([])
      : prisma.session.findMany({
          where: { eventId, organisationId: ctx.organisation.id },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
          take: 100,
        }),
    isInsights
      ? loadVenueMapInsights(ctx.organisation.id, eventId)
      : Promise.resolve(null),
  ]);

  if (isInsights && insights) {
    void auditMapInsightsView({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Venue"
        title="Floor plan & navigation"
        description={
          isInsights
            ? "See how attendees search, navigate, mark presence, and scan floor QRs."
            : "Upload floors, place locations, print QR sheets, and optionally let Con·cierge map stands from the image."
        }
        actions={
          isInsights ? undefined : (
            <Link
              href={insightsHref}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[0.84375rem] font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              Open map insights
            </Link>
          )
        }
      />
      <VenueSectionTabs
        orgSlug={orgSlug}
        eventId={eventId}
        active={activeSection}
      />
      {isInsights && insights ? (
        <VenueInsightsPanel insights={insights} />
      ) : (
        <VenueOrganiserPanel
          orgSlug={orgSlug}
          eventId={eventId}
          aiFloorPlanEnabled={ctx.organisation.venueAiFloorPlanEnabled}
          rooms={rooms}
          sessions={sessions}
          floorPlans={floorPlans.map((floorPlan) => ({
            id: floorPlan.id,
            name: floorPlan.name,
            floorIndex: floorPlan.floorIndex,
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
          }))}
        />
      )}
    </div>
  );
}
