"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Send, Trash2 } from "lucide-react";
import { createContact, deleteContact } from "@/modules/contacts/actions";
import { createInvitationsForContacts } from "@/modules/invitations/actions";
import {
  contactCreateFieldErrors,
  contactCreateFromFormData,
  contactCreateSchema,
  type ContactCreateInput,
} from "@/modules/contacts/parse";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { ColumnFilterTh } from "@/components/column-filter-th";
import { InvitationStatusIcon } from "@/components/invitation-status-icon";
import {
  TABLE_PAGE_SIZE,
  TablePagination,
  paginate,
} from "@/components/table-pagination";
import { COUNTRIES } from "@/lib/countries";
import { displayName, humanizeEnum } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type InviteeRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  invitationStatus: string | null;
  categoryId: string | null;
  categoryName: string | null;
};

type CategoryOption = { id: string; name: string };

type FieldErrors = Partial<Record<keyof ContactCreateInput, string>>;

const UNINVITED_FILTER = "__none__";

function FieldMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-[0.8125rem] text-danger">
      {message}
    </p>
  );
}

export function InviteesPanel({
  orgSlug,
  eventId,
  contacts,
  categories,
  canWrite,
  canInvite,
}: {
  orgSlug: string;
  eventId: string;
  contacts: InviteeRow[];
  categories: CategoryOption[];
  canWrite: boolean;
  canInvite: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<InviteeRow | null>(null);
  const importHref = `/app/${orgSlug}/events/${eventId}/invitees/import`;

  const categoryFilterOptions = useMemo(
    () => [
      ...categories.map((c) => ({ value: c.id, label: c.name })),
      { value: UNINVITED_FILTER, label: "No category" },
    ],
    [categories],
  );

  const statusFilterOptions = useMemo(() => {
    const statuses = new Set<string>();
    for (const c of contacts) {
      if (c.invitationStatus) statuses.add(c.invitationStatus);
    }
    return [
      { value: UNINVITED_FILTER, label: "Not invited" },
      ...[...statuses]
        .sort()
        .map((status) => ({ value: status, label: humanizeEnum(status) })),
    ];
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (filterCategoryId === UNINVITED_FILTER) {
        if (c.categoryId) return false;
      } else if (filterCategoryId && c.categoryId !== filterCategoryId) {
        return false;
      }
      if (filterStatus === UNINVITED_FILTER) {
        if (c.invitationStatus) return false;
      } else if (filterStatus && c.invitationStatus !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [contacts, filterCategoryId, filterStatus]);

  useEffect(() => {
    setPage(1);
  }, [filterCategoryId, filterStatus]);

  const { page: safePage, pageCount, slice } = paginate(
    filteredContacts,
    page,
    TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page]);

  const uninvitedSelected = useMemo(
    () =>
      filteredContacts.filter(
        (c) => selected.includes(c.id) && !c.invitationStatus,
      ),
    [filteredContacts, selected],
  );

  const selectedMatchingCount = useMemo(
    () => filteredContacts.filter((c) => selected.includes(c.id)).length,
    [filteredContacts, selected],
  );

  const allFilteredSelected =
    filteredContacts.length > 0 &&
    selectedMatchingCount === filteredContacts.length;
  const someFilteredSelected =
    selectedMatchingCount > 0 && !allFilteredSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  function toggleOne(id: string) {
    setSelected((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );
  }

  function toggleAllMatching() {
    if (allFilteredSelected) {
      const ids = new Set(filteredContacts.map((c) => c.id));
      setSelected((list) => list.filter((x) => !ids.has(x)));
    } else {
      setSelected((list) => {
        const existing = new Set(list);
        const next = [...list];
        for (const c of filteredContacts) {
          if (!existing.has(c.id)) next.push(c.id);
        }
        return next;
      });
    }
  }

  function openDrawer() {
    setError(null);
    setFieldErrors({});
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Guest list
          </p>
          <h1 className="mt-1 font-display text-3xl text-ink-800">Invitees</h1>
          <p className="mt-1 text-sm text-stone-700">
            Contacts for this event. An invitee is not yet registered.
          </p>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={importHref}
              className="inline-flex h-11 items-center justify-center rounded-sm border border-stone-300 bg-transparent px-5 text-[0.9375rem] font-semibold text-ink-700 hover:border-ink-400 hover:bg-stone-50 active:bg-stone-100"
            >
              Import CSV / Excel
            </Link>
            <Button type="button" onClick={openDrawer}>
              Add invitee
            </Button>
          </div>
        ) : null}
      </div>

      {notice ? <p className="text-sm text-moss-600">{notice}</p> : null}

      {contacts.length === 0 ? (
        <Card>
          <p className="text-stone-700">No invitees yet.</p>
          {canWrite ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openDrawer}
                className="text-sm font-semibold text-ink-700 hover:text-ink-800"
              >
                Add an invitee
              </button>
              <Link href={importHref} className="text-sm text-ink-700 hover:text-ink-800">
                Import a contact list
              </Link>
            </div>
          ) : null}
        </Card>
      ) : (
        <>
          {canInvite && uninvitedSelected.length > 0 ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Select
                className="h-9 w-auto px-3 text-sm"
                value={bulkCategoryId}
                onChange={(e) => setBulkCategoryId(e.target.value)}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  start(async () => {
                    try {
                      const result = await createInvitationsForContacts(
                        orgSlug,
                        eventId,
                        uninvitedSelected.map((c) => c.id),
                        bulkCategoryId || undefined,
                      );
                      setSelected([]);
                      setNotice(`Created ${result.created} invitation(s).`);
                      router.refresh();
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Bulk invite failed",
                      );
                    }
                  });
                }}
              >
                <Send className="mr-1.5 size-4" />
                {pending
                  ? "Creating…"
                  : `Send invitation to ${uninvitedSelected.length} selected`}
              </Button>
            </div>
          ) : null}
          <Table>
            <thead>
              <tr>
                <Th>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="size-4 accent-ink-700"
                    checked={allFilteredSelected}
                    onChange={toggleAllMatching}
                    aria-label="Select all matching invitees"
                  />
                </Th>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Company</Th>
                <ColumnFilterTh
                  label="Category"
                  value={filterCategoryId}
                  options={categoryFilterOptions}
                  onChange={setFilterCategoryId}
                  allLabel="All categories"
                />
                <ColumnFilterTh
                  label="Invitation"
                  value={filterStatus}
                  options={statusFilterOptions}
                  onChange={setFilterStatus}
                  allLabel="All statuses"
                />
                {canWrite ? <Th aria-label="Actions"> </Th> : null}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <Td colSpan={canWrite ? 7 : 6} className="text-stone-500">
                    No invitees match these filters.
                  </Td>
                </tr>
              ) : (
                slice.map((contact) => (
                  <tr key={contact.id}>
                    <Td>
                      <input
                        type="checkbox"
                        className="size-4 accent-ink-700"
                        checked={selected.includes(contact.id)}
                        onChange={() => toggleOne(contact.id)}
                        aria-label={`Select ${contact.email}`}
                      />
                    </Td>
                    <Td>{displayName(contact)}</Td>
                    <Td>{contact.email}</Td>
                    <Td>{contact.company ?? "—"}</Td>
                    <Td>{contact.categoryName ?? "—"}</Td>
                    <Td>
                      <InvitationStatusIcon status={contact.invitationStatus} />
                    </Td>
                    {canWrite ? (
                      <Td>
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            title="Delete invitee"
                            disabled={pending}
                            className="rounded-sm p-1.5 text-stone-500 hover:bg-stone-100 hover:text-danger disabled:opacity-50"
                            onClick={() => setDeleteTarget(contact)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete invitee</span>
                          </button>
                        </div>
                      </Td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          <TablePagination
            page={safePage}
            pageCount={pageCount}
            total={filteredContacts.length}
            onPageChange={setPage}
          />
        </>
      )}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add invitee"
        description="Create a contact for this event. Choosing a category creates a draft invitation; sending is a separate step."
      >
        <form
          ref={formRef}
          className="space-y-4"
          noValidate
          action={(formData) => {
            const parsed = contactCreateSchema.safeParse(
              contactCreateFromFormData(formData),
            );
            if (!parsed.success) {
              setFieldErrors(contactCreateFieldErrors(parsed.error));
              setError("Check the highlighted fields and try again.");
              return;
            }
            setFieldErrors({});
            setError(null);
            start(async () => {
              try {
                const created = await createContact(orgSlug, eventId, formData);
                formRef.current?.reset();
                setOpen(false);
                setNotice(`${displayName(created)} has been added to this event.`);
                router.refresh();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not add invitee",
                );
              }
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="invitee-first-name">First name</Label>
              <Input
                id="invitee-first-name"
                name="firstName"
                autoComplete="given-name"
                aria-invalid={Boolean(fieldErrors.firstName)}
                aria-describedby={
                  fieldErrors.firstName ? "invitee-first-name-error" : undefined
                }
              />
              <FieldMessage
                id="invitee-first-name-error"
                message={fieldErrors.firstName}
              />
            </div>
            <div>
              <Label htmlFor="invitee-last-name">Last name</Label>
              <Input
                id="invitee-last-name"
                name="lastName"
                autoComplete="family-name"
                aria-invalid={Boolean(fieldErrors.lastName)}
                aria-describedby={
                  fieldErrors.lastName ? "invitee-last-name-error" : undefined
                }
              />
              <FieldMessage
                id="invitee-last-name-error"
                message={fieldErrors.lastName}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="invitee-email">Email</Label>
            <Input
              id="invitee-email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "invitee-email-error" : undefined}
            />
            <FieldMessage id="invitee-email-error" message={fieldErrors.email} />
          </div>
          <div>
            <Label htmlFor="invitee-phone">Phone</Label>
            <Input
              id="invitee-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "invitee-phone-error" : undefined}
            />
            <FieldMessage id="invitee-phone-error" message={fieldErrors.phone} />
          </div>
          <div>
            <Label htmlFor="invitee-company">Company</Label>
            <Input
              id="invitee-company"
              name="company"
              autoComplete="organization"
              aria-invalid={Boolean(fieldErrors.company)}
              aria-describedby={
                fieldErrors.company ? "invitee-company-error" : undefined
              }
            />
            <FieldMessage
              id="invitee-company-error"
              message={fieldErrors.company}
            />
          </div>
          <div>
            <Label htmlFor="invitee-job-title">Job title</Label>
            <Input
              id="invitee-job-title"
              name="jobTitle"
              autoComplete="organization-title"
              aria-invalid={Boolean(fieldErrors.jobTitle)}
              aria-describedby={
                fieldErrors.jobTitle ? "invitee-job-title-error" : undefined
              }
            />
            <FieldMessage
              id="invitee-job-title-error"
              message={fieldErrors.jobTitle}
            />
          </div>
          <div>
            <Label htmlFor="invitee-country">Country</Label>
            <Select
              id="invitee-country"
              name="country"
              defaultValue=""
              autoComplete="country-name"
              aria-invalid={Boolean(fieldErrors.country)}
              aria-describedby={
                fieldErrors.country ? "invitee-country-error" : undefined
              }
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Select>
            <FieldMessage
              id="invitee-country-error"
              message={fieldErrors.country}
            />
          </div>
          <div>
            <Label htmlFor="invitee-category">Category</Label>
            <Select id="invitee-category" name="categoryId" defaultValue="">
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[0.8125rem] text-stone-500">
              Optional. Creates a draft invitation for this category.
            </p>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <Button disabled={pending}>
              {pending ? "Adding…" : "Add invitee"}
            </Button>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => (pending ? undefined : setDeleteTarget(null))}
        title="Delete this invitee"
        description={
          deleteTarget
            ? `Remove ${displayName(deleteTarget)} (${deleteTarget.email}) from this event. Cancelled attendee records for this invitee will be cleared. Active registrations must be cancelled under Attendees first.`
            : "Remove this invitee from the event."
        }
        confirmLabel="Delete invitee"
        cancelLabel="Keep invitee"
        destructive
        pending={pending}
        onConfirm={() => {
          if (!deleteTarget) return;
          setError(null);
          setNotice(null);
          start(async () => {
            try {
              await deleteContact(orgSlug, eventId, deleteTarget.id);
              setSelected((list) => list.filter((id) => id !== deleteTarget.id));
              setDeleteTarget(null);
              setNotice(`${displayName(deleteTarget)} has been removed.`);
              toast.success(`${displayName(deleteTarget)} has been removed.`);
              router.refresh();
            } catch (e) {
              const message =
                e instanceof Error ? e.message : "Could not delete invitee";
              setError(message);
              toast.error(message);
              setDeleteTarget(null);
            }
          });
        }}
      />
    </div>
  );
}
