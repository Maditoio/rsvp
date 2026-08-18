import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { RouteDrawer } from "@/components/ui/drawer";
import { EventCreateForm } from "./event-create-form";

export default async function NewEventPage({
  params,
}: PageProps<"/app/[orgSlug]/events/new">) {
  const { orgSlug } = await params;
  await safe(() => requireOrg(orgSlug, "event.create"));
  return (
    <RouteDrawer
      title="Create event"
      description="Branding, invitations, registrations, and check-in all hang off this record."
      closeHref={`/app/${orgSlug}/events`}
      size="lg"
    >
      <EventCreateForm orgSlug={orgSlug} />
    </RouteDrawer>
  );
}
