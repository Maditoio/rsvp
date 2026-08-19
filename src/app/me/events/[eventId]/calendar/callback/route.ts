import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { exchangeGoogleCode } from "@/modules/calendar/google";
import { writeAudit } from "@/modules/audit/log";
import { getAppUrl } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const user = await requireUser();

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const calendarUrl = `${getAppUrl()}/me/events/${eventId}/calendar`;

  if (error || !code) {
    return NextResponse.redirect(`${calendarUrl}?error=access_denied`);
  }

  const redirectUri = `${getAppUrl()}/me/events/${eventId}/calendar/callback`;

  try {
    const tokens = await exchangeGoogleCode(code, redirectUri);

    const attendee = await prisma.attendee.findFirst({
      where: { eventId, userId: user.id },
      select: { organisationId: true },
    });
    if (!attendee) {
      return NextResponse.redirect(`${calendarUrl}?error=not_registered`);
    }

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

    return NextResponse.redirect(calendarUrl);
  } catch {
    return NextResponse.redirect(`${calendarUrl}?error=exchange_failed`);
  }
}
