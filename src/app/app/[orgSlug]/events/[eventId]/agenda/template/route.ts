import { requireEvent } from "@/lib/authz/require";
import { sessionTemplateCsv } from "@/modules/sessions/parse";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgSlug: string; eventId: string }> },
) {
  const { orgSlug, eventId } = await params;
  await requireEvent(orgSlug, eventId, "event.update");

  const csv = sessionTemplateCsv();
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="bizcon-agenda-template.csv"',
    },
  });
}
