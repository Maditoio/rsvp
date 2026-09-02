import { EventNavScope } from "@/components/shells/event-nav-scope";
import { EventLayoutFrame } from "@/components/shells/event-layout-frame";
import { SuspensionNotice } from "@/components/suspension-notice";
import { requireEvent } from "@/lib/authz/require";
import { isSuspensionError, suspensionScope } from "@/lib/authz/suspension";
import { fromAuthz } from "@/lib/authz/safe";
import { prisma } from "@/lib/db/prisma";

export default async function EventLayout({
  children,
  params,
}: LayoutProps<"/app/[orgSlug]/events/[eventId]">) {
  const { orgSlug, eventId } = await params;

  let ctx;
  try {
    ctx = await requireEvent(orgSlug, eventId, "event.read");
  } catch (error) {
    const scope = suspensionScope(error);
    if (isSuspensionError(error) && scope) {
      return <SuspensionNotice scope={scope} />;
    }
    fromAuthz(error);
  }

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
      <EventLayoutFrame
        orgSlug={orgSlug}
        eventId={eventId}
        eventName={event?.name ?? "Event"}
        grants={ctx.grants}
      >
        {children}
      </EventLayoutFrame>
    </EventNavScope>
  );
}
