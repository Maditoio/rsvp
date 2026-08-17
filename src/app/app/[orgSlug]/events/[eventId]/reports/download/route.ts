import { AuthzError } from "@/lib/db/tenant";
import { redirect } from "next/navigation";
import {
  exportAttendeesCsv,
  exportInviteesCsv,
} from "@/modules/reports/export";

export async function GET(
  request: Request,
  ctx: RouteContext<"/app/[orgSlug]/events/[eventId]/reports/download">,
) {
  const { orgSlug, eventId } = await ctx.params;
  const kind = new URL(request.url).searchParams.get("kind");

  if (kind !== "attendees" && kind !== "invitees") {
    return new Response("Unknown export kind", { status: 400 });
  }

  try {
    const csv =
      kind === "attendees"
        ? await exportAttendeesCsv(orgSlug, eventId)
        : await exportInviteesCsv(orgSlug, eventId);
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
