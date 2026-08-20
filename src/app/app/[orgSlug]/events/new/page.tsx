import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventCreateForm } from "./event-create-form";

export default async function NewEventPage({
  params,
}: PageProps<"/app/[orgSlug]/events/new">) {
  const { orgSlug } = await params;
  await safe(() => requireOrg(orgSlug, "event.create"));
  return <EventCreateForm orgSlug={orgSlug} />;
}
