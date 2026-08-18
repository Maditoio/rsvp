import { EventNavScope } from "@/components/shells/event-nav-scope";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { prisma } from "@/lib/db/prisma";

export default async function EventLayout({
  children,
  params,
}: LayoutProps<"/app/[orgSlug]/events/[eventId]">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const event = await prisma.event.findFirst({
    where: { id: eventId, organisationId: ctx.organisation.id },
    select: { name: true },
  });

  return (
    <EventNavScope
      eventId={eventId}
      eventName={event?.name ?? "Event"}
      grants={ctx.grants}
    >
      {children}
    </EventNavScope>
  );
}
