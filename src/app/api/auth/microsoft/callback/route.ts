import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { exchangeMicrosoftCode } from "@/modules/calendar/microsoft";
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

    const tokens = await exchangeMicrosoftCode(code, appUrl);

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
          // Microsoft may omit refresh_token on reconnect — keep the prior one.
          refreshTokenEnc: tokens.refreshToken ?? existing.refreshTokenEnc,
          expiresAt: tokens.expiresAt,
          scopes: "Calendars.ReadWrite",
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
          scopes: "Calendars.ReadWrite",
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
