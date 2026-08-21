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
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state")?.trim() ?? "";

  const teamsMatch = /^teams:([^:]+):([^:]+):([^:]+)$/.exec(state);
  if (teamsMatch) {
    const [, orgSlug, eventId, sessionId] = teamsMatch;
    const agendaUrl = `${appUrl}/app/${encodeURIComponent(orgSlug!)}/events/${encodeURIComponent(eventId!)}/agenda?session=${encodeURIComponent(sessionId!)}&teams=connected`;

    if (error || !code) {
      return NextResponse.redirect(
        `${appUrl}/app/${encodeURIComponent(orgSlug!)}/events/${encodeURIComponent(eventId!)}/agenda?session=${encodeURIComponent(sessionId!)}&teams=access_denied`,
      );
    }

    try {
      const user = await requireUser();
      await requireEvent(orgSlug!, eventId!, "event.update");

      const session = await prisma.session.findFirst({
        where: {
          id: sessionId!,
          eventId: eventId!,
        },
        select: { id: true, organisationId: true },
      });
      if (!session) {
        return NextResponse.redirect(
          `${appUrl}/app/${encodeURIComponent(orgSlug!)}/events/${encodeURIComponent(eventId!)}/agenda?teams=invalid_session`,
        );
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
            organisationId: session.organisationId,
            accessTokenEnc: tokens.accessToken,
            refreshTokenEnc: tokens.refreshToken ?? existing.refreshTokenEnc,
            expiresAt: tokens.expiresAt,
            scopes,
          },
        });
      } else {
        await prisma.calendarConnection.create({
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
      return NextResponse.redirect(agendaUrl);
    } catch (err) {
      if (err instanceof AuthzError && err.status === 401) {
        return NextResponse.redirect(`${appUrl}/sign-in`);
      }
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
