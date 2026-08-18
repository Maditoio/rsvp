import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { RouteDrawer } from "@/components/ui/drawer";
import { ContactImportForm } from "./import-form";

export default async function InviteesImportPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/invitees/import">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "invitees.write"));

  return (
    <RouteDrawer
      title="Import invitees"
      description="Upload a CSV or Excel file, preview the rows, and then commit valid invitees."
      closeHref={`/app/${orgSlug}/events/${eventId}/invitees`}
      size="lg"
    >
      <ContactImportForm orgSlug={orgSlug} eventId={eventId} />
    </RouteDrawer>
  );
}
