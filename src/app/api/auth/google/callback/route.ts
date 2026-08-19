import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { exchangeGoogleCode } from "@/modules/calendar/google";
import { writeAudit } from "@/modules/audit/log";
import { getAppUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const eventId = url.searchParams.get("state")?.trim() ?? "";

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

    const tokens = await exchangeGoogleCode(code, appUrl);

    const existing = await prisma.calendarConnection.findFirst({
      where: { userId: user.id, provider: "google" },
    });
    if (existing) {
      await prisma.calendarConnection.update({
        where: { id: existing.id },
        data: {
          accessTokenEnc: tokens.accessToken,
          refreshTokenEnc: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scopes: "calendar.events",
        },
      });
    } else {
      await prisma.calendarConnection.create({
        data: {
          organisationId: attendee.organisationId,
          userId: user.id,
          provider: "google",
          accessTokenEnc: tokens.accessToken,
          refreshTokenEnc: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scopes: "calendar.events",
        },
      });
    }

    await writeAudit({
      organisationId: attendee.organisationId,
      eventId,
      userId: user.id,
      action: "calendar.connect",
      resource: "calendar_connection",
      metadata: { provider: "google" },
    });

    return NextResponse.redirect(fallbackUrl);
  } catch {
    return NextResponse.redirect(`${fallbackUrl}?error=exchange_failed`);
  }
}
