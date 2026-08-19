import { AuthzError } from "@/lib/db/tenant";
import { redirect } from "next/navigation";
import {
  exportAttendeesCsv,
  exportCheckinsCsv,
  exportInviteesCsv,
  exportMeetingsCsv,
} from "@/modules/reports/export";

export async function GET(
  request: Request,
  ctx: RouteContext<"/app/[orgSlug]/events/[eventId]/reports/download">,
) {
  const { orgSlug, eventId } = await ctx.params;
  const kind = new URL(request.url).searchParams.get("kind");

  const validKinds = ["attendees", "invitees", "checkins", "meetings"] as const;
  if (!validKinds.includes(kind as (typeof validKinds)[number])) {
    return new Response("Unknown export kind", { status: 400 });
  }

  try {
    const exporters = {
      attendees: exportAttendeesCsv,
      invitees: exportInviteesCsv,
      checkins: exportCheckinsCsv,
      meetings: exportMeetingsCsv,
    };
    const csv = await exporters[kind as keyof typeof exporters](orgSlug, eventId);
    const filename = `${kind}-${eventId}.csv`;
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 401) redirect("/sign-in");
      return new Response(error.message, { status: error.status });
    }
    throw error;
  }
}
