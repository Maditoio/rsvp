import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { encryptSecret } from "@/lib/crypto/secret";
import { requireOrg, requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { writeAudit } from "@/modules/audit/log";
import { getAppUrl } from "@/lib/utils";
import { consumeOAuthState, exchangeHubSpotCode } from "@/modules/hubspot";

/**
 * HubSpot OAuth callback.
 * Production redirect URI: https://bizconrsvp.com/api/auth/hubspot/callback
 */
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const nonce = url.searchParams.get("state")?.trim() ?? "";

  async function integrationsRedirect(
    organisationId: string | null,
    hubspotStatus: string,
  ) {
    if (!organisationId) {
      return `${appUrl}/app?hubspot=${hubspotStatus}`;
    }
    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { slug: true },
    });
    if (!org) return `${appUrl}/app?hubspot=${hubspotStatus}`;
    return `${appUrl}/app/${encodeURIComponent(org.slug)}/integrations?hubspot=${hubspotStatus}`;
  }

  // Peek org from state for redirect target on early failures (does not consume).
  let peekedOrgId: string | null = null;
  if (nonce) {
    const peeked = await prisma.oAuthState.findUnique({
      where: { nonce },
      select: { organisationId: true },
    });
    peekedOrgId = peeked?.organisationId ?? null;
  }

  if (error) {
    return NextResponse.redirect(
      await integrationsRedirect(peekedOrgId, "access_denied"),
    );
  }

  if (!code || !nonce) {
    return NextResponse.redirect(
      await integrationsRedirect(peekedOrgId, "invalid_state"),
    );
  }

  try {
    const user = await requireUser();

    const { organisationId } = await consumeOAuthState({
      provider: "hubspot",
      nonce,
      userId: user.id,
    });

    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { slug: true },
    });
    if (!org) {
      return NextResponse.redirect(`${appUrl}/app?hubspot=org_missing`);
    }

    // Permission check after state consume — integrations are settings.manage.
    await requireOrg(org.slug, "settings.manage");

    const tokens = await exchangeHubSpotCode(code, appUrl);

    const connection = await prisma.hubSpotConnection.upsert({
      where: { organisationId },
      create: {
        organisationId,
        portalId: tokens.portalId,
        accessTokenEnc: encryptSecret(tokens.accessToken),
        refreshTokenEnc: encryptSecret(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        connectedByUserId: user.id,
      },
      update: {
        portalId: tokens.portalId,
        accessTokenEnc: encryptSecret(tokens.accessToken),
        refreshTokenEnc: encryptSecret(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        connectedByUserId: user.id,
      },
    });

    await writeAudit({
      organisationId,
      userId: user.id,
      action: "hubspot.connect",
      resource: "hubspot_connection",
      resourceId: connection.id,
      metadata: {
        portalId: tokens.portalId,
        scopes: tokens.scopes,
      },
    });

    revalidatePath(`/app/${org.slug}/settings`);
    revalidatePath(`/app/${org.slug}/integrations`);
    return NextResponse.redirect(
      `${appUrl}/app/${encodeURIComponent(org.slug)}/integrations?hubspot=connected`,
    );
  } catch (err) {
    if (err instanceof AuthzError && err.status === 401) {
      return NextResponse.redirect(`${appUrl}/sign-in`);
    }

    const message = err instanceof Error ? err.message : "";
    const status =
      message === "oauth_state_expired"
        ? "state_expired"
        : message === "oauth_state_reused" || message === "invalid_oauth_state"
          ? "invalid_state"
          : err instanceof AuthzError
            ? "forbidden"
            : "exchange_failed";

    return NextResponse.redirect(await integrationsRedirect(peekedOrgId, status));
  }
}
