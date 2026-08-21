"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import {
  importHubSpotContacts,
  listHubSpotContactsForImport,
  type HubSpotImportSelection,
} from "@/modules/hubspot/actions";
import type { HubSpotContactRow } from "@/modules/hubspot/contacts";
import { cn } from "@/lib/utils";

type CategoryOption = { id: string; name: string };

export function HubSpotImportForm({
  orgSlug,
  eventId,
  connected,
  portalId,
  categories,
}: {
  orgSlug: string;
  eventId: string;
  connected: boolean;
  portalId: string | null;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const inviteesHref = `/app/${orgSlug}/events/${eventId}/invitees`;
  const importHref = `/app/${orgSlug}/events/${eventId}/invitees/import`;
  const integrationsHref = `/app/${orgSlug}/integrations`;

  const selectAllRef = useRef<HTMLInputElement>(null);
  const [contacts, setContacts] = useState<HubSpotContactRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(connected);
  const [importing, startImport] = useTransition();
  const [loadingMore, startLoadMore] = useTransition();
  const busy = importing || loadingMore;

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listHubSpotContactsForImport(orgSlug, eventId)
      .then((result) => {
        if (cancelled) return;
        if (!result.connected) {
          setContacts([]);
          setNextCursor(null);
          return;
        }
        setContacts(result.contacts);
        setNextCursor(result.nextCursor);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load HubSpot contacts");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connected, orgSlug, eventId]);

  const selectableIds = useMemo(
    () => contacts.filter((c) => c.email).map((c) => c.id),
    [contacts],
  );

  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.includes(id));
  const someSelected =
    selectableIds.some((id) => selected.includes(id)) && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !selectableIds.includes(id)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...selectableIds])]);
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function loadMore() {
    if (!nextCursor) return;
    setError(null);
    startLoadMore(async () => {
      try {
        const result = await listHubSpotContactsForImport(
          orgSlug,
          eventId,
          nextCursor,
        );
        if (!result.connected) return;
        setContacts((prev) => {
          const seen = new Set(prev.map((c) => c.id));
          const appended = result.contacts.filter((c) => !seen.has(c.id));
          return [...prev, ...appended];
        });
        setNextCursor(result.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load more contacts");
      }
    });
  }

  function runImport() {
    setError(null);
    setNotice(null);
    const byId = new Map(contacts.map((c) => [c.id, c]));
    const selections: HubSpotImportSelection[] = [];
    for (const id of selected) {
      const row = byId.get(id);
      if (!row) continue;
      selections.push({
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        company: row.company || undefined,
        jobTitle: row.jobTitle || undefined,
      });
    }
    if (selections.length === 0) {
      setError("Select at least one contact with an email address.");
      return;
    }

    startImport(async () => {
      try {
        const result = await importHubSpotContacts(
          orgSlug,
          eventId,
          selections,
          categoryId || null,
        );
        const parts = [
          `Imported ${result.created}`,
          result.skippedDuplicate
            ? `${result.skippedDuplicate} already on this event`
            : null,
          result.skippedEmpty ? `${result.skippedEmpty} missing email` : null,
          result.skippedInvalid ? `${result.skippedInvalid} invalid` : null,
        ].filter(Boolean);
        setNotice(parts.join(" · "));
        if (result.created > 0) {
          router.push(inviteesHref);
          router.refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not import contacts");
      }
    });
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Header importHref={importHref} inviteesHref={inviteesHref} />
        <div className="rounded-md border border-stone-200 bg-stone-0 p-5">
          <p className="font-semibold text-ink-800">HubSpot is not connected</p>
          <p className="mt-1 text-sm text-stone-600">
            Connect your organisation HubSpot account in Integrations, then
            return here to import contacts as invitees.
          </p>
          <Link
            href={integrationsHref}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-sm border border-stone-300 bg-transparent px-4 text-sm font-semibold text-ink-700 hover:border-ink-400 hover:bg-stone-50"
          >
            Open Integrations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Header importHref={importHref} inviteesHref={inviteesHref} />

      <p className="text-sm text-stone-600">
        Organisation HubSpot
        {portalId ? ` · portal ${portalId}` : ""}. Select contacts to add as
        invitees for this event. Nothing is written back to HubSpot.
      </p>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {notice ? <p className="text-sm text-moss-700">{notice}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-[14rem] flex-1">
          <label
            htmlFor="hubspot-category"
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500"
          >
            Invitation category (optional)
          </label>
          <Select
            id="hubspot-category"
            className="mt-1.5 h-10"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={busy}
          >
            <option value="">No category — contact only</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-stone-500">
            If chosen, a draft invitation is created for each new invitee.
          </p>
        </div>
        <Button
          type="button"
          disabled={importing || selected.length === 0}
          onClick={runImport}
        >
          {importing
            ? "Importing…"
            : `Import selected (${selected.length})`}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-stone-600">Loading HubSpot contacts…</p>
      ) : contacts.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-stone-0 p-5">
          <p className="text-sm text-stone-700">
            No contacts returned from HubSpot for this portal.
          </p>
        </div>
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th className="w-12">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={selectableIds.length === 0 || busy}
                    aria-label="Select all on this list"
                    className="size-4 rounded-sm border-stone-300"
                  />
                </Th>
                <Th>First name</Th>
                <Th>Last name</Th>
                <Th>Email</Th>
                <Th>Company</Th>
                <Th>Job title</Th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => {
                const hasEmail = Boolean(contact.email);
                const isChecked = selected.includes(contact.id);
                return (
                  <tr
                    key={contact.id}
                    className={cn(
                      "border-t border-stone-100",
                      !hasEmail && "opacity-60",
                    )}
                  >
                    <Td>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!hasEmail || busy}
                        onChange={() => toggleOne(contact.id)}
                        aria-label={`Select ${contact.email || contact.id}`}
                        className="size-4 rounded-sm border-stone-300"
                      />
                    </Td>
                    <Td className="text-ink-800">
                      {contact.firstName || "—"}
                    </Td>
                    <Td className="text-ink-800">
                      {contact.lastName || "—"}
                    </Td>
                    <Td>
                      {contact.email || (
                        <span className="text-stone-500">No email</span>
                      )}
                    </Td>
                    <Td>{contact.company || "—"}</Td>
                    <Td>{contact.jobTitle || "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">
              Showing {contacts.length} contact
              {contacts.length === 1 ? "" : "s"}
              {nextCursor ? " · more available" : ""}
            </p>
            {nextCursor ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={loadMore}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function Header({
  importHref,
  inviteesHref,
}: {
  importHref: string;
  inviteesHref: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link
          href={inviteesHref}
          className="font-medium text-bronze-700 hover:text-bronze-800"
        >
          ← Back to invitees
        </Link>
        <Link
          href={importHref}
          className="font-medium text-stone-600 hover:text-ink-800"
        >
          Import options
        </Link>
      </div>
      <h1 className="mt-4 font-display text-3xl text-ink-800">
        Import from HubSpot
      </h1>
      <p className="mt-1 text-sm text-stone-700">
        Choose contacts from your connected HubSpot portal. They become invitees
        for this event only.
      </p>
    </div>
  );
}
