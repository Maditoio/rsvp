"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ImportContactsTable } from "@/components/data-table/import-contacts-table";
import {
  importSalesforceContacts,
  listSalesforceContactsForImport,
  type SalesforceImportSelection,
} from "@/modules/salesforce/actions";
import type { SalesforceContactRow } from "@/modules/salesforce/contacts";

type CategoryOption = { id: string; name: string };

export function SalesforceImportForm({
  orgSlug,
  eventId,
  connected,
  salesforceOrgId,
  categories,
}: {
  orgSlug: string;
  eventId: string;
  connected: boolean;
  salesforceOrgId: string | null;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const inviteesHref = `/app/${orgSlug}/events/${eventId}/invitees`;
  const importHref = `/app/${orgSlug}/events/${eventId}/invitees/import`;
  const integrationsHref = `/app/${orgSlug}/integrations`;

  const [contacts, setContacts] = useState<SalesforceContactRow[]>([]);
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
    void listSalesforceContactsForImport(orgSlug, eventId)
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
        setError(
          e instanceof Error ? e.message : "Could not load Salesforce contacts",
        );
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

  function toggleAll() {
    if (
      selectableIds.length > 0 &&
      selectableIds.every((id) => selected.includes(id))
    ) {
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
        const result = await listSalesforceContactsForImport(
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
        setError(
          e instanceof Error ? e.message : "Could not load more contacts",
        );
      }
    });
  }

  function runImport() {
    setError(null);
    setNotice(null);
    const byId = new Map(contacts.map((c) => [c.id, c]));
    const selections: SalesforceImportSelection[] = [];
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
        const result = await importSalesforceContacts(
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
        <div className="rounded-xl bg-white shadow-sm p-5">
          <p className="font-semibold text-slate-900">Salesforce is not connected</p>
          <p className="mt-1 text-sm text-slate-600">
            Connect your organisation Salesforce account in Integrations, then
            return here to import contacts as invitees.
          </p>
          <Link
            href={integrationsHref}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-transparent px-4 text-sm font-semibold text-slate-700 hover:border-indigo-400 hover:bg-slate-50"
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

      <p className="text-sm text-slate-600">
        Organisation Salesforce
        {salesforceOrgId ? ` · org ${salesforceOrgId}` : ""}. Select contacts to
        add as invitees for this event. Nothing is written back to Salesforce.
      </p>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {notice ? <p className="text-sm text-success">{notice}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-[14rem] flex-1">
          <label
            htmlFor="salesforce-category"
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500"
          >
            Invitation category (optional)
          </label>
          <Select
            id="salesforce-category"
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
          <p className="mt-1 text-xs text-slate-500">
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
        <p className="text-sm text-slate-600">Loading Salesforce contacts…</p>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl bg-white shadow-sm p-5">
          <p className="text-sm text-slate-700">
            No contacts returned from Salesforce for this org.
          </p>
        </div>
      ) : (
        <ImportContactsTable
          contacts={contacts}
          selected={selected}
          onToggleOne={toggleOne}
          onToggleAll={toggleAll}
          busy={busy}
          nextCursor={nextCursor}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          pageParam="spage"
        />
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
          className="font-medium text-indigo-700 hover:text-indigo-800"
        >
          ← Back to invitees
        </Link>
        <Link
          href={importHref}
          className="font-medium text-slate-600 hover:text-slate-900"
        >
          Import options
        </Link>
      </div>
      <h1 className="mt-4 font-display text-3xl text-slate-900">
        Import from Salesforce
      </h1>
      <p className="mt-1 text-sm text-slate-700">
        Choose contacts from your connected Salesforce org. They become invitees
        for this event only.
      </p>
    </div>
  );
}
