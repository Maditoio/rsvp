"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret } from "@/lib/crypto/secret";
import { requireEvent, requireOrg } from "@/lib/authz/require";
import { writeAudit } from "@/modules/audit/log";
import { commitContactImport } from "@/modules/contacts/actions";
import { normalizeEmail, type ImportRow } from "@/modules/contacts/parse";
import {
  fetchSalesforceContactsPage,
  SALESFORCE_CONTACTS_PAGE_SIZE,
  type SalesforceContactRow,
} from "./contacts";
import {
  getValidSalesforceAccessToken,
  revokeSalesforceToken,
} from "./oauth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function integrationsPath(orgSlug: string) {
  return `/app/${orgSlug}/settings`;
}

function settingsPath(orgSlug: string) {
  return `/app/${orgSlug}/settings`;
}

/** Disconnect the organisation Salesforce connection. Requires settings.manage. */
export async function disconnectSalesforce(orgSlug: string) {
  const ctx = await requireOrg(orgSlug, "settings.manage");

  const connection = await prisma.salesforceConnection.findUnique({
    where: { organisationId: ctx.organisation.id },
  });
  if (!connection) throw new Error("Salesforce is not connected");

  try {
    const refreshToken = decryptSecret(connection.refreshTokenEnc);
    await revokeSalesforceToken(refreshToken);
  } catch {
    // Proceed with local delete even if decrypt/revoke fails.
  }

  await prisma.salesforceConnection.delete({
    where: { id: connection.id },
  });

  await writeAudit({
    organisationId: ctx.organisation.id,
    userId: ctx.user.id,
    action: "salesforce.disconnect",
    resource: "salesforce_connection",
    resourceId: connection.id,
    metadata: { salesforceOrgId: connection.salesforceOrgId },
  });

  revalidatePath(settingsPath(orgSlug));
  revalidatePath(integrationsPath(orgSlug));
}

export type ListSalesforceContactsResult =
  | {
      connected: false;
      contacts: [];
      nextCursor: null;
      salesforceOrgId: null;
      pageSize: number;
    }
  | {
      connected: true;
      contacts: SalesforceContactRow[];
      nextCursor: string | null;
      salesforceOrgId: string | null;
      pageSize: number;
    };

/** Fetch one page of Salesforce contacts for event invitee import. Read-only. */
export async function listSalesforceContactsForImport(
  orgSlug: string,
  eventId: string,
  nextCursor?: string | null,
): Promise<ListSalesforceContactsResult> {
  const ctx = await requireEvent(orgSlug, eventId, "invitees.write");

  const connection = await prisma.salesforceConnection.findUnique({
    where: { organisationId: ctx.organisation.id },
    select: {
      id: true,
      instanceUrl: true,
      accessTokenEnc: true,
      refreshTokenEnc: true,
      expiresAt: true,
      salesforceOrgId: true,
    },
  });

  if (!connection) {
    return {
      connected: false,
      contacts: [],
      nextCursor: null,
      salesforceOrgId: null,
      pageSize: SALESFORCE_CONTACTS_PAGE_SIZE,
    };
  }

  try {
    const { accessToken, instanceUrl } =
      await getValidSalesforceAccessToken(connection);
    const page = await fetchSalesforceContactsPage(instanceUrl, accessToken, {
      nextCursor: nextCursor ?? null,
      limit: SALESFORCE_CONTACTS_PAGE_SIZE,
    });

    return {
      connected: true,
      contacts: page.contacts,
      nextCursor: page.nextCursor,
      salesforceOrgId: connection.salesforceOrgId,
      pageSize: SALESFORCE_CONTACTS_PAGE_SIZE,
    };
  } catch (firstError) {
    // One forced refresh then retry (Salesforce tokens often lack expires_in).
    const { accessToken, instanceUrl } = await getValidSalesforceAccessToken(
      connection,
      { forceRefresh: true },
    );
    try {
      const page = await fetchSalesforceContactsPage(instanceUrl, accessToken, {
        nextCursor: nextCursor ?? null,
        limit: SALESFORCE_CONTACTS_PAGE_SIZE,
      });
      return {
        connected: true,
        contacts: page.contacts,
        nextCursor: page.nextCursor,
        salesforceOrgId: connection.salesforceOrgId,
        pageSize: SALESFORCE_CONTACTS_PAGE_SIZE,
      };
    } catch {
      throw firstError;
    }
  }
}

export type SalesforceImportSelection = {
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
 * Import selected Salesforce contacts as event Contacts (invitees).
 * Does not write back to Salesforce. Requires invitees.write.
 */
export async function importSalesforceContacts(
  orgSlug: string,
  eventId: string,
  selections: SalesforceImportSelection[],
  categoryId?: string | null,
) {
  const ctx = await requireEvent(orgSlug, eventId, "invitees.write");

  if (!Array.isArray(selections) || selections.length === 0) {
    throw new Error("Select at least one Salesforce contact to import.");
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
    action: "contacts.import.salesforce",
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
