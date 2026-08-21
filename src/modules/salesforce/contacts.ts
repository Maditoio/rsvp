import { z } from "zod";
import { salesforceApiBase } from "./oauth";

export const SALESFORCE_CONTACTS_PAGE_SIZE = 100;

const contactRecordSchema = z.object({
  Id: z.string(),
  FirstName: z.string().nullable().optional(),
  LastName: z.string().nullable().optional(),
  Email: z.string().nullable().optional(),
  Title: z.string().nullable().optional(),
  Account: z
    .object({
      Name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const queryResponseSchema = z.object({
  done: z.boolean(),
  nextRecordsUrl: z.string().optional(),
  records: z.array(contactRecordSchema),
});

export type SalesforceContactRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
};

function prop(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function mapSalesforceContact(
  raw: z.infer<typeof contactRecordSchema>,
): SalesforceContactRow {
  return {
    id: raw.Id,
    firstName: prop(raw.FirstName),
    lastName: prop(raw.LastName),
    email: prop(raw.Email).toLowerCase(),
    company: prop(raw.Account?.Name),
    jobTitle: prop(raw.Title),
  };
}

export type SalesforceContactsPage = {
  contacts: SalesforceContactRow[];
  nextCursor: string | null;
};

/**
 * Read-only list of Salesforce Contacts (paginated via SOQL / queryMore).
 * Does not write to Salesforce.
 *
 * @param nextCursor - Absolute or relative nextRecordsUrl from a prior page.
 */
export async function fetchSalesforceContactsPage(
  instanceUrl: string,
  accessToken: string,
  options?: { nextCursor?: string | null; limit?: number },
): Promise<SalesforceContactsPage> {
  const limit = Math.min(
    Math.max(options?.limit ?? SALESFORCE_CONTACTS_PAGE_SIZE, 1),
    SALESFORCE_CONTACTS_PAGE_SIZE,
  );

  let url: string;
  if (options?.nextCursor) {
    const cursor = options.nextCursor;
    url = cursor.startsWith("http")
      ? cursor
      : `${instanceUrl.replace(/\/$/, "")}${cursor.startsWith("/") ? "" : "/"}${cursor}`;
  } else {
    const soql = [
      "SELECT Id, FirstName, LastName, Email, Title, Account.Name",
      "FROM Contact",
      "ORDER BY LastName NULLS LAST, FirstName NULLS LAST",
      `LIMIT ${limit}`,
    ].join(" ");
    url = `${salesforceApiBase(instanceUrl)}/query?q=${encodeURIComponent(soql)}`;
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Salesforce denied access. Reconnect Salesforce in Integrations and try again.",
      );
    }
    throw new Error(
      `Salesforce contacts request failed (${res.status}). ${text.slice(0, 200)}`,
    );
  }

  const parsed = queryResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("Unexpected response from Salesforce contacts API.");
  }

  return {
    contacts: parsed.data.records.map(mapSalesforceContact),
    nextCursor: parsed.data.done
      ? null
      : (parsed.data.nextRecordsUrl ?? null),
  };
}
