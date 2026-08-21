import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { getAppUrl } from "@/lib/utils";
import {
  createOAuthState,
  getHubSpotAuthUrl,
  hubspotConfigured,
  purgeExpiredOAuthStates,
} from "@/modules/hubspot";

/**
 * Start HubSpot OAuth for an organisation.
 * GET /api/auth/hubspot/start?orgSlug=...
 * Requires settings.manage before redirecting to HubSpot.
 */
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const orgSlug = request.nextUrl.searchParams.get("orgSlug")?.trim() ?? "";

  if (!orgSlug) {
    return NextResponse.redirect(`${appUrl}/app?error=missing_org`);
  }

  const integrationsUrl = `${appUrl}/app/${encodeURIComponent(orgSlug)}/settings?tab=integrations`;

  if (!hubspotConfigured()) {
    return NextResponse.redirect(`${integrationsUrl}?hubspot=not_configured`);
  }

  try {
    const ctx = await requireOrg(orgSlug, "settings.manage");
    await purgeExpiredOAuthStates();
    const nonce = await createOAuthState({
      provider: "hubspot",
      userId: ctx.user.id,
      organisationId: ctx.organisation.id,
    });
    return NextResponse.redirect(getHubSpotAuthUrl(appUrl, nonce));
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 401) {
        return NextResponse.redirect(`${appUrl}/sign-in`);
      }
      return NextResponse.redirect(`${integrationsUrl}?hubspot=forbidden`);
    }
    return NextResponse.redirect(`${integrationsUrl}?hubspot=start_failed`);
  }
}
