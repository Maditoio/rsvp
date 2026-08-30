import "server-only";

import { resolve4, resolveCname } from "node:dns/promises";
import { CUSTOM_DOMAIN_A_TARGET, CUSTOM_DOMAIN_CNAME_TARGET, isApexDomain } from "./custom-domain";

/** Node-only DNS lookup, kept out of custom-domain.ts so client components never bundle node:dns. */
export async function checkCustomDomainDns(
  domain: string,
): Promise<{ verified: boolean; detail: string }> {
  try {
    if (isApexDomain(domain)) {
      const addrs = await resolve4(domain);
      const ok = addrs.includes(CUSTOM_DOMAIN_A_TARGET);
      return {
        verified: ok,
        detail: ok
          ? "A record resolved correctly."
          : `Found A record(s): ${addrs.join(", ") || "none"}. Expected ${CUSTOM_DOMAIN_A_TARGET}.`,
      };
    }
    const cnames = await resolveCname(domain);
    const ok = cnames.some(
      (c) => c.replace(/\.$/, "").toLowerCase() === CUSTOM_DOMAIN_CNAME_TARGET,
    );
    return {
      verified: ok,
      detail: ok
        ? "CNAME resolved correctly."
        : `Found CNAME(s): ${cnames.join(", ") || "none"}. Expected ${CUSTOM_DOMAIN_CNAME_TARGET}.`,
    };
  } catch {
    return {
      verified: false,
      detail: "Could not resolve DNS yet. Records can take a few minutes to a few hours to propagate.",
    };
  }
}
