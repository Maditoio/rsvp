"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelInvitation,
  createInvitationsForContacts,
  sendInvitations,
} from "@/modules/invitations/actions";
import { canTransition } from "@/modules/invitations/lifecycle";
import { InvitationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { displayName } from "@/lib/utils";

const SENDABLE = new Set(["DRAFT", "SCHEDULED", "BOUNCED"]);

type InvitationRow = {
  id: string;
  status: InvitationStatus;
  contact: { firstName: string; lastName: string; email: string };
  category: { name: string } | null;
};

type UninvitedRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
};

type CategoryOption = { id: string; name: string };

export function InvitationsPanel({
  orgSlug,
  eventId,
  invitations,
  uninvited,
  categories,
  canWrite,
}: {
  orgSlug: string;
  eventId: string;
  invitations: InvitationRow[];
  uninvited: UninvitedRow[];
  categories: CategoryOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedInvites, setSelectedInvites] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const allUninvitedSelected =
    uninvited.length > 0 && selectedContacts.length === uninvited.length;
  const sendableSelected = useMemo(
    () =>
      invitations.filter(
        (row) => selectedInvites.includes(row.id) && SENDABLE.has(row.status),
      ),
    [invitations, selectedInvites],
  );

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function run(fn: () => Promise<void>) {
    setError(null);
    setMessage(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-error-500">{error}</p> : null}
      {message ? <p className="text-sm text-success-500">{message}</p> : null}

      <Card>
        <h2 className="font-serif text-2xl text-slate-900">Create invitations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Contacts without an active invitation. Creating a draft is not the same
          as sending, and sending is not registration.
        </p>
        {uninvited.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Every contact already has an active invitation.
          </p>
        ) : (
          <>
            {canWrite ? (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="text-sm text-slate-700">
                  Category
                  <select
                    className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  disabled={pending || selectedContacts.length === 0}
                  onClick={() =>
                    run(async () => {
                      const result = await createInvitationsForContacts(
                        orgSlug,
                        eventId,
                        selectedContacts,
                        categoryId || undefined,
                      );
                      setSelectedContacts([]);
                      setMessage(`Created ${result.created} invitation(s).`);
                    })
                  }
                >
                  Create invitations
                </Button>
              </div>
            ) : null}
            <div className="mt-4">
              <Table>
                <thead>
                  <tr className="border-b border-slate-100">
                    {canWrite ? (
                      <Th>
                        <input
                          type="checkbox"
                          className="size-4 accent-slate-500"
                          checked={allUninvitedSelected}
                          onChange={() =>
                            setSelectedContacts(
                              allUninvitedSelected
                                ? []
                                : uninvited.map((c) => c.id),
                            )
                          }
                          aria-label="Select all uninvited"
                        />
                      </Th>
                    ) : null}
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Company</Th>
                  </tr>
                </thead>
                <tbody>
                  {uninvited.map((contact) => (
                    <tr key={contact.id} className="border-b border-slate-50">
                      {canWrite ? (
                        <Td>
                          <input
                            type="checkbox"
                            className="size-4 accent-slate-500"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() =>
                              setSelectedContacts((list) =>
                                toggle(list, contact.id),
                              )
                            }
                            aria-label={`Select ${contact.email}`}
                          />
                        </Td>
                      ) : null}
                      <Td>{displayName(contact)}</Td>
                      <Td>{contact.email}</Td>
                      <Td>{contact.company ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl text-slate-900">Invitations</h2>
          {canWrite ? (
            <Button
              type="button"
              disabled={pending || sendableSelected.length === 0}
              onClick={() =>
                run(async () => {
                  const result = await sendInvitations(
                    orgSlug,
                    eventId,
                    sendableSelected.map((row) => row.id),
                  );
                  setSelectedInvites([]);
                  setMessage(`Sent ${result.sent} invitation(s).`);
                })
              }
            >
              Send selected
            </Button>
          ) : null}
        </div>
        {invitations.length === 0 ? (
          <Card>No invitations yet.</Card>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-slate-100">
                {canWrite ? <Th /> : null}
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th>Category</Th>
                {canWrite ? <Th /> : null}
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="border-b border-slate-50">
                  {canWrite ? (
                    <Td>
                      <input
                        type="checkbox"
                        className="size-4 accent-slate-500"
                        checked={selectedInvites.includes(invitation.id)}
                        disabled={!SENDABLE.has(invitation.status)}
                        onChange={() =>
                          setSelectedInvites((list) => toggle(list, invitation.id))
                        }
                        aria-label={`Select invitation for ${invitation.contact.email}`}
                      />
                    </Td>
                  ) : null}
                  <Td>
                    <p>{displayName(invitation.contact)}</p>
                    <p className="text-xs text-slate-500">
                      {invitation.contact.email}
                    </p>
                  </Td>
                  <Td>
                    <StatusBadge status={invitation.status} />
                  </Td>
                  <Td>{invitation.category?.name ?? "—"}</Td>
                  {canWrite ? (
                    <Td>
                      {canTransition(invitation.status, InvitationStatus.CANCELLED) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={pending}
                          onClick={() => {
                            if (!window.confirm("Cancel this invitation?")) return;
                            run(async () => {
                              await cancelInvitation(
                                orgSlug,
                                eventId,
                                invitation.id,
                              );
                              setMessage("Invitation cancelled.");
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
