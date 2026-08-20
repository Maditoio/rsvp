import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { ContactImportForm } from "./import-form";

export default async function InviteesImportPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/invitees/import">) {
  const { orgSlug, eventId } = await params;
  await safe(() => requireEvent(orgSlug, eventId, "invitees.write"));

  return <ContactImportForm orgSlug={orgSlug} eventId={eventId} />;
}
