"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  deleteEventSponsorAction,
  removeEventSponsorLogoAction,
  reorderEventSponsorAction,
} from "@/modules/sponsors/actions";
import {
  sponsorAltText,
  type EventSponsorRecord,
  type EventSponsorTierGroup,
} from "@/modules/sponsors/config";
import { SponsorForm } from "./sponsor-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionsMenu } from "@/components/data-table/actions-menu";
import { useToast } from "@/components/ui/toast";

export function SponsorList({
  orgSlug,
  eventId,
  groups,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  groups: EventSponsorTierGroup[];
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<EventSponsorRecord | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<EventSponsorRecord | null>(null);
  const [pending, start] = useTransition();

  const total = groups.reduce((sum, group) => sum + group.sponsors.length, 0);

  if (total === 0) {
    return (
      <Card className="space-y-3 p-6">
        <p className="text-sm text-slate-600">No sponsors yet.</p>
        <p className="text-sm text-slate-500">
          Choose a tier above and drop logo files to add sponsors. They appear on
          the event website and can be selected for badge printing in{" "}
          <Link
            href={`/app/${orgSlug}/events/${eventId}/settings?tab=badges`}
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            badge settings
          </Link>
          .
        </p>
      </Card>
    );
  }

  function reorder(sponsorId: string, direction: "up" | "down") {
    start(async () => {
      const result = await reorderEventSponsorAction(
        orgSlug,
        eventId,
        sponsorId,
        direction,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.tier}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {group.label}
              </h2>
              <span className="text-xs text-slate-500">
                {group.sponsors.length}{" "}
                {group.sponsors.length === 1 ? "sponsor" : "sponsors"}
              </span>
            </div>

            {group.sponsors.length === 0 ? (
              <Card className="p-4 text-sm text-slate-500">
                No {group.label.toLowerCase()} sponsors yet.
              </Card>
            ) : (
              <ul className="space-y-2">
                {group.sponsors.map((sponsor, index) => {
                  const label = sponsorAltText(sponsor);
                  return (
                  <li
                    key={sponsor.id}
                    className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
                  >
                    {sponsor.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sponsor.logoUrl}
                        alt={label}
                        className="h-10 w-16 shrink-0 object-contain"
                      />
                    ) : (
                      <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[0.625rem] text-slate-400">
                        No logo
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">
                        {sponsor.name}
                      </p>
                      {sponsor.websiteUrl ? (
                        <a
                          href={sponsor.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          {sponsor.websiteUrl}
                        </a>
                      ) : (
                        <p className="text-xs text-slate-400">No website</p>
                      )}
                    </div>

                    {canManage ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pending || index === 0}
                          aria-label={`Move ${label} up`}
                          onClick={() => reorder(sponsor.id, "up")}
                        >
                          <ArrowUp className="size-4" strokeWidth={1.75} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={
                            pending || index === group.sponsors.length - 1
                          }
                          aria-label={`Move ${label} down`}
                          onClick={() => reorder(sponsor.id, "down")}
                        >
                          <ArrowDown className="size-4" strokeWidth={1.75} />
                        </Button>
                        <ActionsMenu
                          disabled={pending}
                          items={[
                            {
                              id: "edit",
                              label: "Edit sponsor",
                              icon: (
                                <Pencil
                                  className="size-3.5 shrink-0"
                                  strokeWidth={1.75}
                                />
                              ),
                              onSelect: () => setEditTarget(sponsor),
                            },
                            ...(sponsor.logoUrl
                              ? [
                                  {
                                    id: "remove-logo",
                                    label: "Remove logo",
                                    onSelect: () => {
                                      start(async () => {
                                        const result =
                                          await removeEventSponsorLogoAction(
                                            orgSlug,
                                            eventId,
                                            sponsor.id,
                                          );
                                        if (!result.ok) {
                                          toast.error(result.error);
                                          return;
                                        }
                                        toast.success("Logo removed.");
                                        router.refresh();
                                      });
                                    },
                                  },
                                ]
                              : []),
                            {
                              id: "delete",
                              label: "Delete sponsor",
                              destructive: true,
                              icon: (
                                <Trash2
                                  className="size-3.5 shrink-0"
                                  strokeWidth={1.75}
                                />
                              ),
                              onSelect: () => setDeleteTarget(sponsor),
                            },
                          ]}
                        />
                      </div>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => (pending ? undefined : setDeleteTarget(null))}
        title="Delete this sponsor"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.name}” from this event. It will disappear from the website and badge selections.`
            : "Remove this sponsor from the event."
        }
        confirmLabel="Delete sponsor"
        cancelLabel="Keep sponsor"
        destructive
        pending={pending}
        onConfirm={() => {
          if (!deleteTarget) return;
          start(async () => {
            const result = await deleteEventSponsorAction(
              orgSlug,
              eventId,
              deleteTarget.id,
            );
            if (!result.ok) {
              toast.error(result.error);
              setDeleteTarget(null);
              return;
            }
            toast.success(`“${deleteTarget.name}” deleted.`);
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />

      {editTarget ? (
        <SponsorForm
          orgSlug={orgSlug}
          eventId={eventId}
          sponsor={editTarget}
          open
          onOpenChange={(next) => {
            if (!next) setEditTarget(null);
          }}
        />
      ) : null}
    </>
  );
}
