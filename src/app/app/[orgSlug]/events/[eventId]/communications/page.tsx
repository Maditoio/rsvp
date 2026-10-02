import { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { listAutomations } from "@/modules/communications/automations";
import { listPostEventCampaigns } from "@/modules/communications/post-event-queue";
import { defaultPostEventSubject } from "@/modules/communications/post-event";
import { CommunicationsPanel } from "./communications-panel";
import type { CommunicationsTabId } from "./communications-tabs";

function parseCommunicationsTab(
  value: string | string[] | undefined,
): CommunicationsTabId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "post-event" || raw === "messages") return raw;
  return "automations";
}

export default async function CommunicationsPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/events/[eventId]/communications">) {
  const { orgSlug, eventId } = await params;
  const query = await searchParams;
  const activeTab = parseCommunicationsTab(query.tab);
  const ctx = await safe(() =>
    requireEvent(orgSlug, eventId, "invitations.write"),
  );
  const [messages, automations, event, categories, polls, postEventCampaigns] =
    await Promise.all([
      prisma.emailMessage.findMany({
        where: { eventId, organisationId: ctx.organisation.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          toEmail: true,
          subject: true,
          status: true,
          sentAt: true,
        },
      }),
      listAutomations(ctx.organisation.id, eventId),
      prisma.event.findFirst({
        where: { id: eventId, organisationId: ctx.organisation.id },
        select: {
          name: true,
          startsAt: true,
          endsAt: true,
          settings: {
            select: {
              automationsEnabled: true,
            },
          },
        },
      }),
      prisma.invitationCategory.findMany({
        where: { eventId, organisationId: ctx.organisation.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.eventPoll.findMany({
        where: { eventId, organisationId: ctx.organisation.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      }),
      listPostEventCampaigns(ctx.organisation.id, eventId),
    ]);

  const eventEnded = (() => {
    const end = event?.endsAt ?? event?.startsAt;
    return Boolean(end && end.getTime() <= Date.now());
  })();

  return (
    <div>
      <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
        <CommunicationsPanel
          orgSlug={orgSlug}
          eventId={eventId}
          eventName={event?.name ?? "Event"}
          activeTab={activeTab}
          canSend={hasPermission(ctx.grants, "invitations.write")}
          automations={automations}
          automationsEnabled={event?.settings?.automationsEnabled !== false}
          eventEnded={eventEnded}
          defaultPostEventSubject={defaultPostEventSubject(event?.name ?? "the event")}
          categories={categories}
          polls={polls}
          postEventCampaigns={postEventCampaigns.map((row) => ({
            id: row.id,
            name: row.name,
            subject: row.subject ?? "",
            audience: row.audience,
            status: row.status,
            queuedCount: row.queuedCount,
            skippedCount: row.skippedCount,
            sentAt: row.sentAt?.toLocaleString("en-GB") ?? "",
            createdAt: row.createdAt.toLocaleString("en-GB"),
          }))}
          messages={messages.map((row) => ({
            id: row.id,
            toEmail: row.toEmail,
            subject: row.subject,
            status: row.status,
            sentAt: row.sentAt?.toLocaleString("en-GB") ?? "",
          }))}
        />
      </Suspense>
    </div>
  );
}
