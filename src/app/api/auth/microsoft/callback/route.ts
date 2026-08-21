import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireEvent, requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";
import {
  exchangeMicrosoftCode,
  MICROSOFT_OAUTH_SCOPES,
} from "@/modules/calendar/microsoft";
import { writeAudit } from "@/modules/audit/log";
import { getAppUrl } from "@/lib/utils";

/**
 * Microsoft OAuth callback — shared by attendee Calendar connect and
 * organiser Teams connect for sessions.
 *
 * State formats:
 * - `{eventId}` — attendee calendar (existing)
 * - `teams:{orgSlug}:{eventId}:{sessionId}` — organiser Teams (event.update)
 */
function logMsCallback(step: string, detail: Record<string, unknown> = {}) {
  // Temporary diagnostics — never include tokens, secrets, or auth codes.
  console.info("[microsoft-oauth-callback]", { step, ...detail });
}

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const state = url.searchParams.get("state")?.trim() ?? "";

  logMsCallback("received", {
    requestHost: url.host,
    appUrl,
    redirectUriUsedForExchange: `${appUrl}/api/auth/microsoft/callback`,
    hasCode: Boolean(code),
    codeLength: code?.length ?? 0,
    oauthError: error,
    oauthErrorDescription: errorDescription?.slice(0, 300) ?? null,
    stateKind: state.startsWith("teams:") ? "teams" : state ? "calendar_event" : "empty",
    stateLength: state.length,
  });

  const teamsMatch = /^teams:([^:]+):([^:]+):([^:]+)$/.exec(state);
  if (teamsMatch) {
    const [, orgSlug, eventId, sessionId] = teamsMatch;
    const agendaUrl = `${appUrl}/app/${encodeURIComponent(orgSlug!)}/events/${encodeURIComponent(eventId!)}/agenda?session=${encodeURIComponent(sessionId!)}&teams=connected`;

    logMsCallback("teams_state_parsed", {
      orgSlug,
      eventId,
      sessionIdPrefix: sessionId!.slice(0, 8),
    });

    if (error || !code) {
      logMsCallback("teams_access_denied_branch", {
        oauthError: error,
        hasCode: Boolean(code),
      });
      return NextResponse.redirect(
        `${appUrl}/app/${encodeURIComponent(orgSlug!)}/events/${encodeURIComponent(eventId!)}/agenda?session=${encodeURIComponent(sessionId!)}&teams=access_denied`,
      );
    }

    try {
      logMsCallback("teams_require_user");
      const user = await requireUser();
      logMsCallback("teams_require_event", { userIdPrefix: user.id.slice(0, 8) });
      await requireEvent(orgSlug!, eventId!, "event.update");

      logMsCallback("teams_lookup_session");
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId!,
          eventId: eventId!,
        },
        select: { id: true, organisationId: true },
      });
      if (!session) {
        logMsCallback("teams_invalid_session");
        return NextResponse.redirect(
          `${appUrl}/app/${encodeURIComponent(orgSlug!)}/events/${encodeURIComponent(eventId!)}/agenda?teams=invalid_session`,
        );
      }

      logMsCallback("teams_token_exchange");
      const tokens = await exchangeMicrosoftCode(code, appUrl);
      const scopes = MICROSOFT_OAUTH_SCOPES.join(" ");

      logMsCallback("teams_upsert_connection", {
        organisationIdPrefix: session.organisationId.slice(0, 8),
        hasRefreshToken: Boolean(tokens.refreshToken),
      });
      const existing = await prisma.calendarConnection.findFirst({
        where: {
          userId: user.id,
          provider: { in: ["microsoft", "outlook"] },
        },
      });
      if (existing) {
        await prisma.calendarConnection.update({
          where: { id: existing.id },
          data: {
            provider: "microsoft",
            organisationId: session.organisationId,
            accessTokenEnc: tokens.accessToken,
            refreshTokenEnc: tokens.refreshToken ?? existing.refreshTokenEnc,
            expiresAt: tokens.expiresAt,
            scopes,
          },
        });
        logMsCallback("teams_connection_updated", { connectionIdPrefix: existing.id.slice(0, 8) });
      } else {
        const created = await prisma.calendarConnection.create({
          data: {
            organisationId: session.organisationId,
            userId: user.id,
            provider: "microsoft",
            accessTokenEnc: tokens.accessToken,
            refreshTokenEnc: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            scopes,
          },
        });
        logMsCallback("teams_connection_created", { connectionIdPrefix: created.id.slice(0, 8) });
      }

      await writeAudit({
        organisationId: session.organisationId,
        eventId: eventId!,
        userId: user.id,
        action: "calendar.connect",
        resource: "calendar_connection",
        metadata: { provider: "microsoft", purpose: "teams" },
      });

      revalidatePath(
        `/app/${orgSlug}/events/${eventId}/agenda`,
      );
      revalidatePath(`/me/events/${eventId}/calendar`);
      logMsCallback("teams_success_redirect");
      return NextResponse.redirect(agendaUrl);
    } catch (err) {
      if (err instanceof AuthzError && err.status === 401) {
        logMsCallback("teams_authz_401");
        return NextResponse.redirect(`${appUrl}/sign-in`);
      }
      console.error("[microsoft-oauth-callback] teams_exchange_failed", {
        name: err instanceof Error ? err.name : typeof err,
        message: err instanceof Error ? err.message.slice(0, 800) : String(err).slice(0, 800),
        status: err instanceof AuthzError ? err.status : undefined,
        appUrl,
        redirectUriUsedForExchange: `${appUrl}/api/auth/microsoft/callback`,
      });
      return NextResponse.redirect(
        `${appUrl}/app/${encodeURIComponent(orgSlug!)}/events/${encodeURIComponent(eventId!)}/agenda?session=${encodeURIComponent(sessionId!)}&teams=exchange_failed`,
      );
    }
  }

  // ── Existing attendee calendar connect flow ──────────────────────────
  const eventId = state;
  const fallbackUrl = eventId
    ? `${appUrl}/me/events/${eventId}/calendar`
    : `${appUrl}/me`;

  if (!eventId) {
    return NextResponse.redirect(`${fallbackUrl}?error=invalid_state`);
  }

  if (error || !code) {
    return NextResponse.redirect(`${fallbackUrl}?error=access_denied`);
  }

  try {
    const user = await requireUser();

    const attendee = await prisma.attendee.findFirst({
      where: { eventId, userId: user.id },
      select: { organisationId: true },
    });
    if (!attendee) {
      return NextResponse.redirect(`${fallbackUrl}?error=not_registered`);
    }

    const tokens = await exchangeMicrosoftCode(code, appUrl);
    const scopes = MICROSOFT_OAUTH_SCOPES.join(" ");

    const existing = await prisma.calendarConnection.findFirst({
      where: {
        userId: user.id,
        provider: { in: ["microsoft", "outlook"] },
      },
    });
    if (existing) {
      await prisma.calendarConnection.update({
        where: { id: existing.id },
        data: {
          provider: "microsoft",
          accessTokenEnc: tokens.accessToken,
          refreshTokenEnc: tokens.refreshToken ?? existing.refreshTokenEnc,
          expiresAt: tokens.expiresAt,
          scopes,
        },
      });
    } else {
      await prisma.calendarConnection.create({
        data: {
          organisationId: attendee.organisationId,
          userId: user.id,
          provider: "microsoft",
          accessTokenEnc: tokens.accessToken,
          refreshTokenEnc: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scopes,
        },
      });
    }

    await writeAudit({
      organisationId: attendee.organisationId,
      eventId,
      userId: user.id,
      action: "calendar.connect",
      resource: "calendar_connection",
      metadata: { provider: "microsoft" },
    });

    revalidatePath(`/me/events/${eventId}/calendar`);
    return NextResponse.redirect(fallbackUrl);
  } catch {
    return NextResponse.redirect(`${fallbackUrl}?error=exchange_failed`);
  }
}
