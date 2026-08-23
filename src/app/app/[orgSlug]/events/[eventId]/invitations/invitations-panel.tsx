"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import {
  DataTable,
  TableFilterSelect,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { ActionsMenu } from "@/components/data-table/actions-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { InvitationStatusIcon } from "@/components/invitation-status-icon";
import { displayName, humanizeEnum } from "@/lib/utils";

const SENDABLE = new Set(["DRAFT", "SCHEDULED", "BOUNCED"]);
const RESENDABLE = new Set([
  "SENT",
  "DELIVERED",
  "OPENED",
  "BOUNCED",
  "ACCEPTED",
]);

const NO_CATEGORY = "__none__";

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
  const selectAllRef = useRef<HTMLInputElement>(null);
  const uninvitedSelectAllRef = useRef<HTMLInputElement>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedInvites, setSelectedInvites] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InvitationRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, start] = useTransition();

  const categoryFilterOptions = useMemo(
    () => [
      ...categories.map((c) => ({ value: c.id, label: c.name })),
      { value: NO_CATEGORY, label: "No category" },
    ],
    [categories],
  );

  const statusFilterOptions = useMemo(() => {
    const statuses = new Set(invitations.map((row) => row.status));
    return [...statuses]
      .sort()
      .map((status) => ({ value: status, label: humanizeEnum(status) }));
  }, [invitations]);

  const filteredInvitations = useMemo(() => {
    return invitations.filter((row) => {
      if (filterCategoryId === NO_CATEGORY) {
        if (row.category) return false;
      } else if (filterCategoryId && row.category?.id !== filterCategoryId) {
        return false;
      }
      if (filterStatus && row.status !== filterStatus) return false;
      return true;
    });
  }, [invitations, filterCategoryId, filterStatus]);

  const sendableSelected = useMemo(
    () =>
      filteredInvitations.filter(
        (row) => selectedInvites.includes(row.id) && SENDABLE.has(row.status),
      ),
    [filteredInvitations, selectedInvites],
  );

  const selectableFiltered = useMemo(
    () => filteredInvitations.filter((row) => SENDABLE.has(row.status)),
    [filteredInvitations],
  );

  const selectedMatchingCount = useMemo(
    () => selectableFiltered.filter((row) => selectedInvites.includes(row.id)).length,
    [selectableFiltered, selectedInvites],
  );

  const allSendableSelected =
    selectableFiltered.length > 0 &&
    selectedMatchingCount === selectableFiltered.length;
  const someSendableSelected =
    selectedMatchingCount > 0 && !allSendableSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSendableSelected;
    }
  }, [someSendableSelected]);

  const allUninvitedSelected =
    uninvited.length > 0 && selectedContacts.length === uninvited.length;
  const someUninvitedSelected =
    selectedContacts.length > 0 && !allUninvitedSelected;

  useEffect(() => {
    if (uninvitedSelectAllRef.current) {
      uninvitedSelectAllRef.current.indeterminate = someUninvitedSelected;
    }
  }, [someUninvitedSelected]);

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function toggleAllSendableMatching() {
    if (allSendableSelected) {
      const ids = new Set(selectableFiltered.map((row) => row.id));
      setSelectedInvites((list) => list.filter((id) => !ids.has(id)));
    } else {
      setSelectedInvites((list) => {
        const existing = new Set(list);
        const next = [...list];
        for (const row of selectableFiltered) {
          if (!existing.has(row.id)) next.push(row.id);
        }
        return next;
      });
    }
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

  const invitationColumns: DataTableColumn<InvitationRow>[] = [
    ...(canWrite
      ? [
          {
            id: "select",
            header: (
              <Checkbox
                ref={selectAllRef}
                checked={allSendableSelected}
                disabled={selectableFiltered.length === 0}
                onChange={toggleAllSendableMatching}
                aria-label="Select all matching sendable invitations"
              />
            ),
            width: "48px",
            headerClassName: "normal-case tracking-normal",
            cell: (invitation: InvitationRow) => (
              <Checkbox
                checked={selectedInvites.includes(invitation.id)}
                disabled={!SENDABLE.has(invitation.status)}
                onChange={() =>
                  setSelectedInvites((list) => toggle(list, invitation.id))
                }
                aria-label={`Select invitation for ${invitation.contact.email}`}
              />
            ),
          } satisfies DataTableColumn<InvitationRow>,
        ]
      : []),
    {
      id: "contact",
      header: "Contact",
      width: "2fr",
      cell: (invitation) => (
        <div>
          <p className="font-medium text-slate-700">
            {displayName(invitation.contact)}
          </p>
          <p className="text-xs text-slate-500">{invitation.contact.email}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "1.2fr",
      cell: (invitation) => <InvitationStatusIcon status={invitation.status} />,
    },
    {
      id: "category",
      header: "Category",
      width: "1.2fr",
      cell: (invitation) => invitation.category?.name ?? "—",
    },
    ...(canWrite
      ? [
          {
            id: "actions",
            header: "",
            width: "60px",
            headerClassName: "sr-only",
            cellClassName: "justify-self-end",
            cell: (invitation: InvitationRow) => {
              const items = [
                ...(SENDABLE.has(invitation.status)
                  ? [
                      {
                        id: "send",
                        label: "Send invitation",
                        icon: (
                          <Send className="size-3.5 shrink-0" strokeWidth={1.75} />
                        ),
                        onSelect: () =>
                          run(`send-${invitation.id}`, async () => {
                            const result = await sendInvitations(
                              orgSlug,
                              eventId,
                              [invitation.id],
                            );
                            setMessage(
                              `Sent ${result.sent} invitation to ${invitation.contact.email}.`,
                            );
                          }),
                      },
                    ]
                  : []),
                ...(RESENDABLE.has(invitation.status)
                  ? [
                      {
                        id: "resend",
                        label: "Resend invitation",
                        icon: (
                          <RotateCw
                            className="size-3.5 shrink-0"
                            strokeWidth={1.75}
                          />
                        ),
                        onSelect: () =>
                          run(`resend-${invitation.id}`, async () => {
                            await resendInvitation(
                              orgSlug,
                              eventId,
                              invitation.id,
                            );
                            setMessage(
                              `Invitation resent to ${invitation.contact.email}.`,
                            );
                          }),
                      },
                    ]
                  : []),
                ...(canTransition(invitation.status, InvitationStatus.CANCELLED)
                  ? [
                      { type: "divider" as const, id: "div" },
                      {
                        id: "cancel",
                        label: "Cancel invitation",
                        destructive: true,
                        icon: (
                          <XCircle
                            className="size-3.5 shrink-0"
                            strokeWidth={1.75}
                          />
                        ),
                        onSelect: () => setCancelTarget(invitation),
                      },
                    ]
                  : []),
              ];
              if (items.length === 0) return null;
              return <ActionsMenu disabled={pending} items={items} />;
            },
          } satisfies DataTableColumn<InvitationRow>,
        ]
      : []),
  ];

  const uninvitedColumns: DataTableColumn<UninvitedRow>[] = [
    {
      id: "select",
      header: (
        <Checkbox
          ref={uninvitedSelectAllRef}
          checked={allUninvitedSelected}
          onChange={() =>
            setSelectedContacts(
              allUninvitedSelected ? [] : uninvited.map((c) => c.id),
            )
          }
          aria-label="Select all uninvited"
        />
      ),
      width: "48px",
      headerClassName: "normal-case tracking-normal",
      cell: (contact) => (
        <Checkbox
          checked={selectedContacts.includes(contact.id)}
          onChange={() =>
            setSelectedContacts((list) => toggle(list, contact.id))
          }
          aria-label={`Select ${contact.email}`}
        />
      ),
    },
    {
      id: "name",
      header: "Name",
      width: "1.5fr",
      cell: (contact) => (
        <span className="font-medium text-slate-700">{displayName(contact)}</span>
      ),
    },
    {
      id: "email",
      header: "Email",
      width: "2fr",
      cell: (contact) => contact.email,
    },
  ];

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <div>
        {canWrite ? (
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
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
              leadingIcon="plus"
              onClick={() => {
                setError(null);
                setDrawerOpen(true);
              }}
            >
              New invitation
            </Button>
          </div>
        ) : null}
        {invitations.length === 0 ? (
          <Card>No invitations yet.</Card>
        ) : (
          <DataTable
            rows={filteredInvitations}
            columns={invitationColumns}
            getRowId={(row) => row.id}
            searchPlaceholder="Search invitations…"
            searchThresholdCount={invitations.length}
            searchFilter={(row, query) => {
              const haystack = [
                displayName(row.contact),
                row.contact.email,
                row.status,
                row.category?.name,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return haystack.includes(query);
            }}
            emptyMessage="No invitations match these filters."
            showRowsPerPage
            minRowHeight="double"
            pageParam="page"
            filterSlot={
              <>
                <TableFilterSelect
                  label="Status"
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={statusFilterOptions}
                  allLabel="All statuses"
                />
                <TableFilterSelect
                  label="Category"
                  value={filterCategoryId}
                  onChange={setFilterCategoryId}
                  options={categoryFilterOptions}
                  allLabel="All categories"
                />
              </>
            }
          />
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Create invitations"
        description="Contacts without an active invitation. Creating a draft is not the same as sending, and sending is not registration."
      >
        {uninvited.length === 0 ? (
          <p className="text-sm text-slate-700">
            Every contact already has an active invitation.
          </p>
        ) : (
          <div className="space-y-4">
            <label className="text-sm text-slate-700">
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
            <DataTable
              rows={uninvited}
              columns={uninvitedColumns}
              getRowId={(row) => row.id}
              searchPlaceholder="Search contacts…"
              searchFilter={(row, query) => {
                const haystack = [displayName(row), row.email, row.company]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();
                return haystack.includes(query);
              }}
              emptyMessage="No contacts left to invite."
              pageParam="upage"
            />
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
