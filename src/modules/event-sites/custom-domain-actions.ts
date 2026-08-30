"use server";

import { revalidatePath } from "next/cache";
import { requireEvent } from "@/lib/authz/require";
import { runAction } from "@/lib/action-result";
import { writeAudit } from "@/modules/audit/log";
import { prisma } from "@/lib/db/prisma";
import {
  isReservedCustomDomain,
  normalizeCustomDomain,
  recommendedDnsRecords,
  type CustomDomainDnsRecord,
  type CustomDomainStatus,
} from "./custom-domain";
import { checkCustomDomainDns } from "./custom-domain-dns";
import {
  addDomainToVercelProject,
  getVercelDomainStatus,
  isVercelDomainSyncConfigured,
  removeDomainFromVercelProject,
} from "./vercel-domains";

export type EventCustomDomainResult = {
  domain: string | null;
  status: CustomDomainStatus;
  error: string | null;
  dnsRecords: CustomDomainDnsRecord[];
  vercelManaged: boolean;
};

function websitePaths(orgSlug: string, eventId: string, eventSlug?: string) {
  const paths = [
    `/app/${orgSlug}/events/${eventId}/website`,
    `/app/${orgSlug}/events/${eventId}`,
  ];
  if (eventSlug) paths.push(`/e/${orgSlug}/${eventSlug}`);
  return paths;
}

export async function setEventCustomDomain(
  orgSlug: string,
  eventId: string,
  rawDomain: string,
): Promise<ReturnType<typeof runAction<EventCustomDomainResult>>> {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");

    const domain = normalizeCustomDomain(rawDomain);
    if (!domain) {
      throw new Error("Enter a valid domain, e.g. tickets.yourcompany.com.");
    }
    if (isReservedCustomDomain(domain)) {
      throw new Error("That domain can't be used as a custom domain for this site.");
    }

    const existing = await prisma.eventSettings.findFirst({
      where: { customDomain: domain, eventId: { not: eventId } },
      select: { eventId: true },
    });
    if (existing) {
      throw new Error("That domain is already connected to another event.");
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { slug: true },
    });
    if (!event) throw new Error("Event not found.");

    let status: CustomDomainStatus = "pending";
    let error: string | null = null;
    let dnsRecords = recommendedDnsRecords(domain);

    if (isVercelDomainSyncConfigured()) {
      const result = await addDomainToVercelProject(domain);
      if (!result.ok) {
        status = "error";
        error = result.error;
      } else if (result.data.verified) {
        status = "verified";
      } else if (result.data.verification.length) {
        dnsRecords = result.data.verification.map((v) => ({
          type: v.type as CustomDomainDnsRecord["type"],
          host: v.domain === domain ? "@" : v.domain.replace(`.${domain}`, ""),
          value: v.value,
        }));
      }
    }

    const now = new Date();
    await prisma.eventSettings.upsert({
      where: { eventId },
      create: {
        organisationId: ctx.organisation.id,
        eventId,
        customDomain: domain,
        customDomainStatus: status,
        customDomainError: error,
        customDomainRequestedAt: now,
        customDomainVerifiedAt: status === "verified" ? now : null,
      },
      update: {
        customDomain: domain,
        customDomainStatus: status,
        customDomainError: error,
        customDomainRequestedAt: now,
        customDomainVerifiedAt: status === "verified" ? now : null,
      },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "event.website.custom_domain_set",
      resource: "event_settings",
      resourceId: eventId,
      metadata: { domain },
    });

    for (const path of websitePaths(orgSlug, eventId, event.slug)) {
      revalidatePath(path);
    }

    return {
      domain,
      status,
      error,
      dnsRecords,
      vercelManaged: isVercelDomainSyncConfigured(),
    };
  }, "Could not save custom domain.");
}

export async function verifyEventCustomDomain(
  orgSlug: string,
  eventId: string,
): Promise<ReturnType<typeof runAction<EventCustomDomainResult>>> {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");

    const settings = await prisma.eventSettings.findFirst({
      where: { eventId, organisationId: ctx.organisation.id },
      select: { customDomain: true },
    });
    const domain = settings?.customDomain ?? null;
    if (!domain) throw new Error("No custom domain is set for this event.");

    let status: CustomDomainStatus;
    let error: string | null = null;
    const dnsRecords = recommendedDnsRecords(domain);

    if (isVercelDomainSyncConfigured()) {
      const result = await getVercelDomainStatus(domain);
      if (!result.ok) {
        status = "error";
        error = result.error;
      } else if (result.data.verified && !result.data.misconfigured) {
        status = "verified";
      } else {
        status = "pending";
        error = result.data.misconfigured
          ? "DNS records don't match what Vercel expects yet."
          : null;
      }
    } else {
      const dns = await checkCustomDomainDns(domain);
      status = dns.verified ? "verified" : "pending";
      error = dns.verified ? null : dns.detail;
    }

    const now = new Date();
    await prisma.eventSettings.update({
      where: { eventId },
      data: {
        customDomainStatus: status,
        customDomainError: error,
        customDomainVerifiedAt: status === "verified" ? now : null,
      },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "event.website.custom_domain_verify",
      resource: "event_settings",
      resourceId: eventId,
      metadata: { domain, status },
    });

    return {
      domain,
      status,
      error,
      dnsRecords,
      vercelManaged: isVercelDomainSyncConfigured(),
    };
  }, "Could not check custom domain status.");
}

export async function removeEventCustomDomain(orgSlug: string, eventId: string) {
  return runAction(async () => {
    const ctx = await requireEvent(orgSlug, eventId, "event.update");

    const settings = await prisma.eventSettings.findFirst({
      where: { eventId, organisationId: ctx.organisation.id },
      select: { customDomain: true },
    });
    const domain = settings?.customDomain ?? null;

    if (domain && isVercelDomainSyncConfigured()) {
      await removeDomainFromVercelProject(domain);
    }

    await prisma.eventSettings.updateMany({
      where: { eventId, organisationId: ctx.organisation.id },
      data: {
        customDomain: null,
        customDomainStatus: "none",
        customDomainError: null,
        customDomainRequestedAt: null,
        customDomainVerifiedAt: null,
      },
    });

    await writeAudit({
      organisationId: ctx.organisation.id,
      eventId,
      userId: ctx.user.id,
      action: "event.website.custom_domain_removed",
      resource: "event_settings",
      resourceId: eventId,
      metadata: { domain },
    });

    const event = await prisma.event.findFirst({
      where: { id: eventId, organisationId: ctx.organisation.id },
      select: { slug: true },
    });
    for (const path of websitePaths(orgSlug, eventId, event?.slug)) {
      revalidatePath(path);
    }

    return undefined;
  }, "Could not remove custom domain.");
}
