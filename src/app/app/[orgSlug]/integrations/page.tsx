import { redirect } from "next/navigation";

/**
 * Legacy Integrations URL — always bounce into Organisation settings.
 * Keeps OAuth query params (`hubspot`, `salesforce`) so status banners still work.
 */
export default async function IntegrationsPage({
  params,
  searchParams,
}: PageProps<"/app/[orgSlug]/integrations">) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const next = new URLSearchParams();
  next.set("tab", "integrations");
  for (const key of ["hubspot", "salesforce"] as const) {
    const value = query[key];
    if (typeof value === "string" && value) next.set(key, value);
  }
  redirect(
    `/app/${encodeURIComponent(orgSlug)}/settings?${next.toString()}`,
  );
}
