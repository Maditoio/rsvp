import { z } from "zod";

const HUBSPOT_CONTACTS_URL = "https://api.hubapi.com/crm/v3/objects/contacts";

export const HUBSPOT_CONTACT_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "company",
  "jobtitle",
] as const;

export const HUBSPOT_CONTACTS_PAGE_SIZE = 100;

const contactResultSchema = z.object({
  id: z.string(),
  properties: z
    .object({
      firstname: z.string().nullable().optional(),
      lastname: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      company: z.string().nullable().optional(),
      jobtitle: z.string().nullable().optional(),
    })
    .passthrough(),
});

const listResponseSchema = z.object({
  results: z.array(contactResultSchema),
  paging: z
    .object({
      next: z
        .object({
          after: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export type HubSpotContactRow = {
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

export function mapHubSpotContact(
  raw: z.infer<typeof contactResultSchema>,
): HubSpotContactRow {
  const p = raw.properties;
  return {
    id: raw.id,
    firstName: prop(p.firstname),
    lastName: prop(p.lastname),
    email: prop(p.email).toLowerCase(),
    company: prop(p.company),
    jobTitle: prop(p.jobtitle),
  };
}

export type HubSpotContactsPage = {
  contacts: HubSpotContactRow[];
  nextCursor: string | null;
};

/**
 * Read-only list of HubSpot CRM contacts (paginated).
 * Does not write to HubSpot.
 */
export async function fetchHubSpotContactsPage(
  accessToken: string,
  options?: { after?: string | null; limit?: number },
): Promise<HubSpotContactsPage> {
  const limit = Math.min(
    Math.max(options?.limit ?? HUBSPOT_CONTACTS_PAGE_SIZE, 1),
    HUBSPOT_CONTACTS_PAGE_SIZE,
  );
  const params = new URLSearchParams({
    limit: String(limit),
    properties: HUBSPOT_CONTACT_PROPERTIES.join(","),
  });
  if (options?.after) params.set("after", options.after);

  const res = await fetch(`${HUBSPOT_CONTACTS_URL}?${params.toString()}`, {
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
        "HubSpot denied access. Reconnect HubSpot in Integrations and try again.",
      );
    }
    throw new Error(`HubSpot contacts request failed (${res.status}). ${text.slice(0, 200)}`);
  }

  const parsed = listResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error("Unexpected response from HubSpot contacts API.");
  }

  return {
    contacts: parsed.data.results.map(mapHubSpotContact),
    nextCursor: parsed.data.paging?.next?.after ?? null,
  };
}
