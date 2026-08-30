import { getAppUrl } from "@/lib/utils";

/**
 * Kept free of Node-only imports (e.g. node:dns) — this module is imported by the
 * client-side DomainPanel for shared constants/formatting, so it must bundle for the browser.
 * DNS verification lives in custom-domain-dns.ts (server actions only).
 */

export const CUSTOM_DOMAIN_STATUS_VALUES = ["none", "pending", "verified", "error"] as const;
export type CustomDomainStatus = (typeof CUSTOM_DOMAIN_STATUS_VALUES)[number];

/** Vercel's documented anycast IP for apex/root domains (A record). */
export const CUSTOM_DOMAIN_A_TARGET = "76.76.21.21";
/** Vercel's documented CNAME target for subdomains. */
export const CUSTOM_DOMAIN_CNAME_TARGET = "cname.vercel-dns.com";

export type CustomDomainDnsRecord = {
  type: "A" | "CNAME";
  host: string;
  value: string;
};

function reservedHosts(): string[] {
  const hosts = ["localhost"];
  try {
    hosts.push(new URL(getAppUrl()).hostname.toLowerCase());
  } catch {
    // ignore — getAppUrl() should always be a valid URL, but don't fail domain validation over it
  }
  return hosts;
}

/** Lowercases, strips protocol/path/port/trailing dot. Returns null if the result isn't a plausible hostname. */
export function normalizeCustomDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;
  value = value.replace(/^[a-z]+:\/\//, "");
  value = value.split("/")[0] ?? value;
  value = value.split(":")[0] ?? value;
  value = value.replace(/\.$/, "");
  if (!value) return null;

  const HOSTNAME_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  if (!HOSTNAME_RE.test(value)) return null;
  return value;
}

export function isReservedCustomDomain(domain: string): boolean {
  if (domain.endsWith(".vercel.app") || domain.endsWith(".vercel-dns.com")) return true;
  return reservedHosts().includes(domain);
}

/** Best-effort heuristic: 2 labels (e.g. "acme.com") is treated as an apex/root domain. */
export function isApexDomain(domain: string): boolean {
  return domain.split(".").length === 2;
}

export function recommendedDnsRecords(domain: string): CustomDomainDnsRecord[] {
  if (isApexDomain(domain)) {
    return [{ type: "A", host: "@", value: CUSTOM_DOMAIN_A_TARGET }];
  }
  const labels = domain.split(".");
  const host = labels.slice(0, -2).join(".") || "@";
  return [{ type: "CNAME", host, value: CUSTOM_DOMAIN_CNAME_TARGET }];
}
