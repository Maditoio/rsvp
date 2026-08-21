import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { encryptSecret } from "@/lib/crypto/secret";
import { requireOrg, requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import { writeAudit } from "@/modules/audit/log";
import { getAppUrl } from "@/lib/utils";
import { consumeOAuthState, exchangeSalesforceCode } from "@/modules/salesforce";

export const runtime = "nodejs";

/**
 * Salesforce OAuth callback (Web Server flow).
 * Production redirect URI: https://bizconrsvp.com/api/auth/salesforce/callback
 */
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const nonce = url.searchParams.get("state")?.trim() ?? "";

  async function integrationsRedirect(
    organisationId: string | null,
    salesforceStatus: string,
  ) {
    if (!organisationId) {
      return `${appUrl}/app?salesforce=${salesforceStatus}`;
    }
    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { slug: true },
    });
    if (!org) return `${appUrl}/app?salesforce=${salesforceStatus}`;
    return `${appUrl}/app/${encodeURIComponent(org.slug)}/settings?tab=integrations&salesforce=${salesforceStatus}`;
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

    const { organisationId, codeVerifier } = await consumeOAuthState({
      provider: "salesforce",
      nonce,
      userId: user.id,
    });

    if (!codeVerifier) {
      return NextResponse.redirect(
        await integrationsRedirect(organisationId, "invalid_state"),
      );
    }

    const org = await prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { slug: true },
    });
    if (!org) {
      return NextResponse.redirect(`${appUrl}/app?salesforce=org_missing`);
    }

    await requireOrg(org.slug, "settings.manage");

    const tokens = await exchangeSalesforceCode(code, appUrl, codeVerifier);

    const connection = await prisma.salesforceConnection.upsert({
      where: { organisationId },
      create: {
        organisationId,
        salesforceOrgId: tokens.salesforceOrgId,
        instanceUrl: tokens.instanceUrl,
        accessTokenEnc: encryptSecret(tokens.accessToken),
        refreshTokenEnc: encryptSecret(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        connectedByUserId: user.id,
      },
      update: {
        salesforceOrgId: tokens.salesforceOrgId,
        instanceUrl: tokens.instanceUrl,
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
      action: "salesforce.connect",
      resource: "salesforce_connection",
      resourceId: connection.id,
      metadata: {
        salesforceOrgId: tokens.salesforceOrgId,
        scopes: tokens.scopes,
      },
    });

    revalidatePath(`/app/${org.slug}/settings`);
    revalidatePath(`/app/${org.slug}/integrations`);
    return NextResponse.redirect(
      `${appUrl}/app/${encodeURIComponent(org.slug)}/settings?tab=integrations&salesforce=connected`,
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
