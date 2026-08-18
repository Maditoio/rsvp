import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { EventSubnav } from "@/components/event-subnav";
import { ensureDefaultRegistrationForm } from "@/modules/registrations/form";
import { RegistrationFormBuilder } from "./form-builder";

export default async function RegistrationFormPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/registration-form">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const form = await ensureDefaultRegistrationForm(ctx.organisation.id, eventId);

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Form"
        grants={ctx.grants}
      />
      <RegistrationFormBuilder
        orgSlug={orgSlug}
        eventId={eventId}
        fields={form.fields}
        canManage={hasPermission(ctx.grants, "event.update")}
      />
    </div>
  );
}
