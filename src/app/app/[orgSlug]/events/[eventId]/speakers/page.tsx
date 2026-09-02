import { Suspense } from "react";
import { requireEvent } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { hasPermission } from "@/lib/authz/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { loadEventSpeakersForEvent } from "@/modules/speakers/service";
import { SpeakerList } from "./speaker-list";

export default async function EventSpeakersPage({
  params,
}: PageProps<"/app/[orgSlug]/events/[eventId]/speakers">) {
  const { orgSlug, eventId } = await params;
  const ctx = await safe(() => requireEvent(orgSlug, eventId, "event.read"));
  const canManage = hasPermission(ctx.grants, "event.update");
  const speakers = await loadEventSpeakersForEvent(ctx.organisation.id, eventId);

  return (
    <div>
      <PageHeader
        title="Speakers"
        description="Manage your event speaker roster. Speakers appear on the event website when the Speakers section is enabled."
        className="mb-6"
      />
      <Suspense fallback={<div className="h-40 rounded-xl bg-white shadow-sm" />}>
        <SpeakerList
          orgSlug={orgSlug}
          eventId={eventId}
          canManage={canManage}
          speakers={speakers}
        />
      </Suspense>
    </div>
  );
}
