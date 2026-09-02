import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireEvent } from "@/lib/authz/require";
import { loadPublishedEventSite } from "@/modules/event-sites/service";
import {
  buildEventSiteRenderData,
  EventSiteRenderer,
} from "@/components/event-sites/event-site-renderer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/e/[orgSlug]/[eventSlug]">): Promise<Metadata> {
  const { orgSlug, eventSlug } = await params;
  const site = await loadPublishedEventSite(orgSlug, eventSlug);
  if (!site) return { title: "Event not found" };

  const seo = site.websiteConfig.seo;
  const title = seo.title || site.eventName;
  const description =
    seo.description ||
    site.websiteConfig.sections.find((s) => s.type === "about")?.content
      ?.body?.toString()
      .slice(0, 160) ||
    `${site.eventName} — hosted by ${site.orgName}`;

  return {
    title,
    description,
    keywords: seo.keywords.length ? seo.keywords : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: site.publicUrl,
      images: seo.ogImage ? [{ url: seo.ogImage }] : site.logoUrl ? [{ url: site.logoUrl }] : undefined,
    },
  };
}

export default async function PublicEventSitePage({
  params,
  searchParams,
}: PageProps<"/e/[orgSlug]/[eventSlug]">) {
  const { orgSlug, eventSlug } = await params;
  const query = await searchParams;
  const preview = query?.preview === "1";

  let organisationId: string | undefined;
  if (preview) {
    try {
      const event = await import("@/lib/db/prisma").then((m) =>
        m.prisma.event.findFirst({
          where: { slug: eventSlug, organisation: { slug: orgSlug } },
          select: { id: true, organisationId: true },
        }),
      );
      if (event) {
        const ctx = await requireEvent(orgSlug, event.id, "event.update");
        organisationId = ctx.organisation.id;
      }
    } catch {
      notFound();
    }
  }

  const site = await loadPublishedEventSite(orgSlug, eventSlug, {
    preview,
    organisationId,
  });
  if (!site) notFound();

  const agendaSection = site.websiteConfig.sections.find((s) => s.type === "agenda");
  const maxSessions =
    typeof agendaSection?.content.maxSessions === "number"
      ? agendaSection.content.maxSessions
      : 8;

  const renderData = buildEventSiteRenderData({
    orgName: site.orgName,
    eventName: site.eventName,
    venue: site.venue,
    startsAt: site.startsAt,
    endsAt: site.endsAt,
    timezone: site.timezone,
    logoUrl: site.logoUrl,
    config: site.websiteConfig,
    sessions: agendaSection?.enabled ? site.sessions.slice(0, maxSessions) : [],
    sponsorGroups: site.sponsorGroups,
    speakers: site.speakers,
    applyUrl: site.applyUrl,
    allowPublicApplication: site.allowPublicApplication,
  });

  return (
    <>
      {preview ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-800">
          Preview mode — this page is not visible to the public until published.
        </div>
      ) : null}
      <EventSiteRenderer data={renderData} />
    </>
  );
}
