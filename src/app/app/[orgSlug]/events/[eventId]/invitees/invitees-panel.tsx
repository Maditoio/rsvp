"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createContact } from "@/modules/contacts/actions";
import {
  contactCreateFieldErrors,
  contactCreateFromFormData,
  contactCreateSchema,
  type ContactCreateInput,
} from "@/modules/contacts/parse";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { COUNTRIES } from "@/lib/countries";
import { displayName } from "@/lib/utils";

type InviteeRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  invitationStatus: string | null;
};

type FieldErrors = Partial<Record<keyof ContactCreateInput, string>>;

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
  canWrite,
}: {
  orgSlug: string;
  eventId: string;
  contacts: InviteeRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const importHref = `/app/${orgSlug}/events/${eventId}/invitees/import`;

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
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Company</Th>
              <Th>Invitation</Th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <Td>{displayName(contact)}</Td>
                <Td>{contact.email}</Td>
                <Td>{contact.company ?? "—"}</Td>
                <Td>
                  {contact.invitationStatus ? (
                    <StatusBadge status={contact.invitationStatus} />
                  ) : (
                    <span className="text-stone-500">Not invited</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Add invitee"
        description="Create a contact for this event. Sending an invitation is a separate step."
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
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end">
            <Button disabled={pending}>
              {pending ? "Adding…" : "Add invitee"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
