import { prisma } from "@/lib/db/prisma";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { listAutomations } from "@/modules/communications/automations";
import { resolveEmailBranding } from "@/modules/communications/email-branding";
import { CommunicationsPanel } from "./communications-panel";

export default async function CommunicationsPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/communications">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() =>
    requireEvent(orgSlug, eventId, "invitations.write"),
  );
  const [messages, automations, event] = await Promise.all([
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
        logoUrl: true,
        settings: {
          select: {
            automationsEnabled: true,
            emailAccentColor: true,
            emailBannerUrl: true,
            websiteConfig: true,
          },
        },
      },
    }),
  ]);

  const branding = resolveEmailBranding({
    logoUrl: event?.logoUrl,
    bannerUrl: event?.settings?.emailBannerUrl,
    emailAccentColor: event?.settings?.emailAccentColor,
    websiteConfig: event?.settings?.websiteConfig,
  });

  return (
    <div>
      <CommunicationsPanel
        orgSlug={orgSlug}
        eventId={eventId}
        canSend={hasPermission(ctx.grants, "invitations.write")}
        automations={automations}
        automationsEnabled={event?.settings?.automationsEnabled !== false}
        branding={branding}
        emailAccentColor={event?.settings?.emailAccentColor ?? null}
        logoUrl={event?.logoUrl ?? null}
        bannerUrl={event?.settings?.emailBannerUrl ?? null}
        messages={messages.map((row) => ({
          id: row.id,
          toEmail: row.toEmail,
          subject: row.subject,
          status: row.status,
          sentAt: row.sentAt?.toLocaleString("en-GB") ?? "",
        }))}
      />
    </div>
  );
}
