"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret } from "@/lib/crypto/secret";
import { requireEvent, requireOrg } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { commitContactImport } from "@/modules/contacts/actions";
import { normalizeEmail, type ImportRow } from "@/modules/contacts/parse";
import {
  fetchHubSpotContactsPage,
  HUBSPOT_CONTACTS_PAGE_SIZE,
  type HubSpotContactRow,
} from "./contacts";
import { getValidHubSpotAccessToken, revokeHubSpotRefreshToken } from "./oauth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function integrationsPath(orgSlug: string) {
  return `/app/${orgSlug}/settings`;
}

function settingsPath(orgSlug: string) {
  return `/app/${orgSlug}/settings`;
}

/** Disconnect the organisation HubSpot connection. Requires settings.manage. */
export async function disconnectHubSpot(orgSlug: string) {
  const ctx = await requireOrg(orgSlug, "settings.manage");

  const connection = await prisma.hubSpotConnection.findUnique({
    where: { organisationId: ctx.organisation.id },
  });
  if (!connection) throw new Error("HubSpot is not connected");

  try {
    const refreshToken = decryptSecret(connection.refreshTokenEnc);
    await revokeHubSpotRefreshToken(refreshToken);
  } catch {
    // Proceed with local delete even if decrypt/revoke fails.
  }

  await prisma.hubSpotConnection.delete({
    where: { id: connection.id },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    userId: ctx.user.id,
    action: "hubspot.disconnect",
    resource: "hubspot_connection",
    resourceId: connection.id,
    metadata: { portalId: connection.portalId },
  });

  revalidatePath(settingsPath(orgSlug));
  revalidatePath(integrationsPath(orgSlug));
}

export type ListHubSpotContactsResult =
  | {
      connected: false;
      contacts: [];
      nextCursor: null;
      portalId: null;
      pageSize: number;
    }
  | {
      connected: true;
      contacts: HubSpotContactRow[];
      nextCursor: string | null;
      portalId: string | null;
      pageSize: number;
    };

/** Fetch one page of HubSpot contacts for event invitee import. Read-only. */
export async function listHubSpotContactsForImport(
  orgSlug: string,
  eventId: string,
  after?: string | null,
): Promise<ListHubSpotContactsResult> {
  const ctx = await requireEvent(orgSlug, eventId, "invitees.write");

  const connection = await prisma.hubSpotConnection.findUnique({
    where: { organisationId: ctx.organisation.id },
    select: {
      id: true,
      accessTokenEnc: true,
      refreshTokenEnc: true,
      expiresAt: true,
      portalId: true,
    },
  });

  if (!connection) {
    return {
      connected: false,
      contacts: [],
      nextCursor: null,
      portalId: null,
      pageSize: HUBSPOT_CONTACTS_PAGE_SIZE,
    };
  }

  const accessToken = await getValidHubSpotAccessToken(connection);
  const page = await fetchHubSpotContactsPage(accessToken, {
    after: after ?? null,
    limit: HUBSPOT_CONTACTS_PAGE_SIZE,
  });

  return {
    connected: true,
    contacts: page.contacts,
    nextCursor: page.nextCursor,
    portalId: connection.portalId,
    pageSize: HUBSPOT_CONTACTS_PAGE_SIZE,
  };
}

export type HubSpotImportSelection = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;
};

function nameOrFallback(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed || fallback;
}

/**
 * Import selected HubSpot contacts as event Contacts (invitees).
 * Does not write back to HubSpot. Requires invitees.write.
 */
export async function importHubSpotContacts(
  orgSlug: string,
  eventId: string,
  selections: HubSpotImportSelection[],
  categoryId?: string | null,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitees.write");

  if (!Array.isArray(selections) || selections.length === 0) {
    throw new Error("Select at least one HubSpot contact to import.");
  }
  if (selections.length > 500) {
    throw new Error("Import at most 500 contacts at a time.");
  }

  let categoryName: string | undefined;
  const trimmedCategoryId = categoryId?.trim() || null;
  if (trimmedCategoryId) {
    const category = await prisma.invitationCategory.findFirst({
      where: {
        id: trimmedCategoryId,
        eventId,
        organisationId: ctx.organisation.id,
      },
      select: { name: true },
    });
    if (!category) throw new Error("Category not found for this event.");
    categoryName = category.name;
  }

  let skippedEmpty = 0;
  let skippedInvalid = 0;
  const seen = new Set<string>();
  const rows: ImportRow[] = [];

  for (let i = 0; i < selections.length; i++) {
    const row = selections[i]!;
    const email = normalizeEmail(row.email ?? "");
    if (!email) {
      skippedEmpty += 1;
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      skippedInvalid += 1;
      continue;
    }
    if (seen.has(email)) {
      skippedInvalid += 1;
      continue;
    }
    seen.add(email);

    const local = email.split("@")[0] || "Contact";
    rows.push({
      firstName: nameOrFallback(row.firstName ?? "", local),
      lastName: nameOrFallback(row.lastName ?? "", "Contact"),
      email,
      company: row.company?.trim() || undefined,
      jobTitle: row.jobTitle?.trim() || undefined,
      category: categoryName,
      line: i + 1,
    });
  }

  const { created, skipped: skippedDuplicate } = await commitContactImport(
    orgSlug,
    eventId,
    rows,
  );

  await writeAudit({
    organisationId: ctx.organisation.id,
    eventId,
    userId: ctx.user.id,
    action: "contacts.import.hubspot",
    resource: "contact",
    metadata: {
      created,
      skippedDuplicate,
      skippedEmpty,
      skippedInvalid,
      selected: selections.length,
      categoryId: trimmedCategoryId,
    },
  });

  return {
    created,
    skippedDuplicate,
    skippedEmpty,
    skippedInvalid,
  };
}
