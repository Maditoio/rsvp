import Link from "next/link";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { EventSubnav } from "@/components/event-subnav";
import { ContactImportForm } from "./import-form";

export default async function InviteesImportPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/invitees/import">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "invitees.write"));

  return (
    <div>
      <EventSubnav
        orgSlug={orgSlug}
        eventId={eventId}
        current="Invitees"
        grants={ctx.grants}
      />
      <p className="mb-4">
        <Link
          href={`/app/${orgSlug}/events/${eventId}/invitees`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Invitees
        </Link>
      </p>
      <ContactImportForm orgSlug={orgSlug} eventId={eventId} />
    </div>
  );
}
