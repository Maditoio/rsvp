import "server-only";

/**
 * Optional integration with the Vercel Domains API so custom domains added in the
 * builder are automatically attached to this project (TLS + edge routing), instead of
 * only being validated at the DNS level. Fully optional — the feature still works with
 * DNS-only self-verification (see custom-domain.ts) when these env vars are unset.
 */

type VercelResult<T> = { ok: true; data: T } | { ok: false; error: string };

function vercelEnv() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  return { token, projectId, teamId };
}

export function isVercelDomainSyncConfigured(): boolean {
  const { token, projectId } = vercelEnv();
  return Boolean(token && projectId);
}

function apiUrl(path: string): string {
  const { teamId } = vercelEnv();
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  return url.toString();
}

async function vercelFetch(path: string, init?: RequestInit): Promise<Response> {
  const { token } = vercelEnv();
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export type VercelDomainVerification = { type: string; domain: string; value: string; reason: string };

/** Adds a domain to the project. Idempotent — returns ok even if already attached. */
export async function addDomainToVercelProject(
  domain: string,
): Promise<VercelResult<{ verified: boolean; verification: VercelDomainVerification[] }>> {
  if (!isVercelDomainSyncConfigured()) {
    return { ok: false, error: "Vercel API is not configured." };
  }
  const { projectId } = vercelEnv();
  try {
    const res = await vercelFetch(`/v10/projects/${projectId}/domains`, {
      method: "POST",
      body: JSON.stringify({ name: domain }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok && body?.error?.code !== "domain_already_in_use") {
      return { ok: false, error: body?.error?.message ?? `Vercel API error (${res.status}).` };
    }
    return {
      ok: true,
      data: {
        verified: Boolean(body?.verified),
        verification: Array.isArray(body?.verification) ? body.verification : [],
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Vercel API request failed." };
  }
}

/** Checks whether the domain is verified and correctly configured at the DNS/edge level. */
export async function getVercelDomainStatus(
  domain: string,
): Promise<VercelResult<{ verified: boolean; misconfigured: boolean }>> {
  if (!isVercelDomainSyncConfigured()) {
    return { ok: false, error: "Vercel API is not configured." };
  }
  const { projectId } = vercelEnv();
  try {
    const [domainRes, configRes] = await Promise.all([
      vercelFetch(`/v9/projects/${projectId}/domains/${domain}`),
      vercelFetch(`/v6/domains/${domain}/config`),
    ]);
    if (!domainRes.ok) {
      const body = await domainRes.json().catch(() => ({}));
      return { ok: false, error: body?.error?.message ?? `Vercel API error (${domainRes.status}).` };
    }
    const domainBody = await domainRes.json().catch(() => ({}));
    const configBody = configRes.ok ? await configRes.json().catch(() => ({})) : {};
    return {
      ok: true,
      data: {
        verified: Boolean(domainBody?.verified),
        misconfigured: Boolean(configBody?.misconfigured),
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Vercel API request failed." };
  }
}

export async function removeDomainFromVercelProject(domain: string): Promise<VercelResult<true>> {
  if (!isVercelDomainSyncConfigured()) {
    return { ok: false, error: "Vercel API is not configured." };
  }
  const { projectId } = vercelEnv();
  try {
    const res = await vercelFetch(`/v9/projects/${projectId}/domains/${domain}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.error?.message ?? `Vercel API error (${res.status}).` };
    }
    return { ok: true, data: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Vercel API request failed." };
  }
}
