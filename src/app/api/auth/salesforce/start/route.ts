import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { getAppUrl } from "@/lib/utils";
import {
  createOAuthState,
  generateSalesforcePkce,
  getSalesforceAuthUrl,
  purgeExpiredOAuthStates,
  salesforceConfigured,
} from "@/modules/salesforce";

export const runtime = "nodejs";

/**
 * Start Salesforce OAuth for an organisation.
 * GET /api/auth/salesforce/start?orgSlug=...
 * Requires settings.manage before redirecting to Salesforce.
 */
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const orgSlug = request.nextUrl.searchParams.get("orgSlug")?.trim() ?? "";

  if (!orgSlug) {
    return NextResponse.redirect(`${appUrl}/app?error=missing_org`);
  }

  const integrationsUrl = `${appUrl}/app/${encodeURIComponent(orgSlug)}/settings?tab=integrations`;

  if (!salesforceConfigured()) {
    return NextResponse.redirect(`${integrationsUrl}?salesforce=not_configured`);
  }

  try {
    const ctx = await requireOrg(orgSlug, "settings.manage");
    await purgeExpiredOAuthStates();
    const pkce = generateSalesforcePkce();
    const state = await createOAuthState({
      provider: "salesforce",
      userId: ctx.user.id,
      organisationId: ctx.organisation.id,
      codeVerifier: pkce.codeVerifier,
    });
    const { url: authUrl } = getSalesforceAuthUrl(appUrl, state, pkce);
    // Absolute https Location required — relative/opaque Locations cause
    // the browser to download a file named "authorize" instead of logging in.
    if (!/^https?:\/\//i.test(authUrl)) {
      console.error("[salesforce-oauth] refusing non-absolute authorize URL");
      return NextResponse.redirect(`${integrationsUrl}?salesforce=start_failed`);
    }
    if (process.env.NODE_ENV === "development") {
      const redacted = authUrl
        .replace(
          /([?&]client_id=)([^&]+)/,
          (_, p, id: string) => `${p}${id.slice(0, 8)}…${id.slice(-4)}`,
        )
        .replace(/([?&]state=)([^&]+)/, "$1[redacted]");
      console.info("[salesforce-oauth] redirecting to", redacted);
    }
    return NextResponse.redirect(authUrl);
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 401) {
        return NextResponse.redirect(`${appUrl}/sign-in`);
      }
      return NextResponse.redirect(`${integrationsUrl}?salesforce=forbidden`);
    }
    console.error("[salesforce-oauth] start failed", error);
    return NextResponse.redirect(`${integrationsUrl}?salesforce=start_failed`);
  }
}
