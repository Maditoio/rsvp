"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Send, XCircle } from "lucide-react";
import {
  cancelInvitation,
  createInvitationsForContacts,
  resendInvitation,
  sendInvitations,
} from "@/modules/invitations/actions";
import { canTransition } from "@/modules/invitations/lifecycle";
import { InvitationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { displayName } from "@/lib/utils";

const SENDABLE = new Set(["DRAFT", "SCHEDULED", "BOUNCED"]);
const RESENDABLE = new Set([
  "SENT",
  "DELIVERED",
  "OPENED",
  "BOUNCED",
  "ACCEPTED",
]);

type InvitationRow = {
  id: string;
  status: InvitationStatus;
  contact: { firstName: string; lastName: string; email: string };
  category: { id: string; name: string } | null;
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
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InvitationRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, start] = useTransition();

  const filteredInvitations = useMemo(
    () =>
      filterCategoryId
        ? invitations.filter((row) => row.category?.id === filterCategoryId)
        : invitations,
    [invitations, filterCategoryId],
  );

  const allUninvitedSelected =
    uninvited.length > 0 && selectedContacts.length === uninvited.length;
  const sendableSelected = useMemo(
    () =>
      filteredInvitations.filter(
        (row) => selectedInvites.includes(row.id) && SENDABLE.has(row.status),
      ),
    [filteredInvitations, selectedInvites],
  );

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function run(key: string, fn: () => Promise<void>) {
    setError(null);
    setMessage(null);
    setPendingKey(key);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-moss-600">{message}</p> : null}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ink-800">Invitations</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="h-9 w-auto px-3 text-sm"
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {canWrite ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending || sendableSelected.length === 0}
                  onClick={() =>
                    run("send", async () => {
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
                  {pendingKey === "send"
                    ? "Sending…"
                    : `Send ${sendableSelected.length > 0 ? `${sendableSelected.length} ` : ""}selected`}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDrawerOpen(true);
                  }}
                >
                  New invitation
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {filteredInvitations.length === 0 ? (
          <Card>No invitations yet.</Card>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-stone-200">
                {canWrite ? <Th /> : null}
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th>Category</Th>
                {canWrite ? <Th /> : null}
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.map((invitation) => (
                <tr key={invitation.id} className="border-b border-stone-100">
                  {canWrite ? (
                    <Td>
                      <input
                        type="checkbox"
                        className="size-4 accent-ink-700"
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
                    <p className="text-xs text-stone-500">
                      {invitation.contact.email}
                    </p>
                  </Td>
                  <Td>
                    <StatusBadge status={invitation.status} />
                  </Td>
                  <Td>{invitation.category?.name ?? "—"}</Td>
                  {canWrite ? (
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        {RESENDABLE.has(invitation.status) ? (
                          <button
                            type="button"
                            title="Resend invitation"
                            disabled={pending}
                            className="rounded-sm p-1.5 text-stone-500 hover:bg-stone-100 hover:text-ink-700 disabled:opacity-50"
                            onClick={() =>
                              run(`resend-${invitation.id}`, async () => {
                                await resendInvitation(
                                  orgSlug,
                                  eventId,
                                  invitation.id,
                                );
                                setMessage(
                                  `Invitation resent to ${invitation.contact.email}.`,
                                );
                              })
                            }
                          >
                            <RotateCw className="size-4" />
                          </button>
                        ) : null}
                        {canTransition(
                          invitation.status,
                          InvitationStatus.CANCELLED,
                        ) ? (
                          <button
                            type="button"
                            title="Cancel invitation"
                            disabled={pending}
                            className="rounded-sm p-1.5 text-stone-500 hover:bg-stone-100 hover:text-danger disabled:opacity-50"
                            onClick={() => setCancelTarget(invitation)}
                          >
                            <XCircle className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Create invitations"
        description="Contacts without an active invitation. Creating a draft is not the same as sending, and sending is not registration."
      >
        {uninvited.length === 0 ? (
          <p className="text-sm text-stone-700">
            Every contact already has an active invitation.
          </p>
        ) : (
          <div className="space-y-4">
            <label className="text-sm text-stone-700">
              Category
              <Select
                className="mt-1"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <Table>
              <thead>
                <tr className="border-b border-stone-200">
                  <Th>
                    <input
                      type="checkbox"
                      className="size-4 accent-ink-700"
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
                  <Th>Name</Th>
                  <Th>Email</Th>
                </tr>
              </thead>
              <tbody>
                {uninvited.map((contact) => (
                  <tr key={contact.id} className="border-b border-stone-100">
                    <Td>
                      <input
                        type="checkbox"
                        className="size-4 accent-ink-700"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() =>
                          setSelectedContacts((list) =>
                            toggle(list, contact.id),
                          )
                        }
                        aria-label={`Select ${contact.email}`}
                      />
                    </Td>
                    <Td>{displayName(contact)}</Td>
                    <Td>{contact.email}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={pending || selectedContacts.length === 0}
                onClick={() =>
                  run("create", async () => {
                    const result = await createInvitationsForContacts(
                      orgSlug,
                      eventId,
                      selectedContacts,
                      categoryId || undefined,
                    );
                    setSelectedContacts([]);
                    setDrawerOpen(false);
                    setMessage(`Created ${result.created} invitation(s).`);
                  })
                }
              >
                {pendingKey === "create"
                  ? "Creating…"
                  : `Create ${selectedContacts.length > 0 ? `${selectedContacts.length} ` : ""}invitation(s)`}
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => (pending ? undefined : setCancelTarget(null))}
        title="Cancel this invitation"
        description={
          cancelTarget
            ? `This invalidates the unique link for ${displayName(cancelTarget.contact)}. They will not be able to accept or register with it.`
            : "This invalidates the unique invitation link."
        }
        confirmLabel="Cancel invitation"
        cancelLabel="Keep invitation"
        destructive
        pending={pending}
        onConfirm={() => {
          if (!cancelTarget) return;
          run(`cancel-${cancelTarget.id}`, async () => {
            await cancelInvitation(orgSlug, eventId, cancelTarget.id);
            setCancelTarget(null);
            setMessage("Invitation cancelled.");
          });
        }}
      />
    </div>
  );
}
