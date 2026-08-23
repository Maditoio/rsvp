"use client";

import type { EventRole, OrgRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  assignEventStaff,
  changeEventStaffRole,
  removeEventStaff,
} from "@/modules/access/actions";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { RowActionsMenu } from "@/components/data-table/row-actions-menu";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import {
  EventRoleTag,
  OrgRoleTag,
  RoleAbsence,
} from "@/components/ui/role-tag";
import { displayName, humanizeEnum } from "@/lib/utils";
import { eventRoleLabel } from "@/modules/workspaces/labels";
import { isValidEmail } from "@/lib/validation";
import { useToast } from "@/components/ui/toast";

const roles: EventRole[] = [
  "EVENT_ADMINISTRATOR",
  "REGISTRATION_MANAGER",
  "CHECKIN_STAFF",
];

type StaffAssignment = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: EventRole;
  orgRole: OrgRole | null;
  assignedAt: string;
  isCurrentUser: boolean;
};

export function StaffManagement({
  orgSlug,
  eventId,
  staff,
  canManage,
}: {
  orgSlug: string;
  eventId: string;
  staff: StaffAssignment[];
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const columns = useMemo<DataTableColumn<StaffAssignment>[]>(() => {
    const cols: DataTableColumn<StaffAssignment>[] = [
      {
        id: "member",
        header: "Member",
        width: "2fr",
        cell: (member) => (
          <div>
            <p className="font-medium text-slate-700">
              {displayName(member)}
              {member.isCurrentUser ? " (you)" : ""}
            </p>
            <p className="text-xs text-slate-500">{member.email}</p>
          </div>
        ),
      },
      {
        id: "orgRole",
        header: "Organisation role",
        width: "1.3fr",
        cell: (member) =>
          member.orgRole ? (
            <OrgRoleTag role={member.orgRole} />
          ) : (
            <RoleAbsence>No org role</RoleAbsence>
          ),
      },
      {
        id: "eventRole",
        header: "Event role",
        width: "1.5fr",
        cell: (member) => <EventRoleTag role={member.role} />,
      },
      {
        id: "assigned",
        header: "Assigned",
        width: "1fr",
        cell: (member) => (
          <span className="whitespace-nowrap">{member.assignedAt}</span>
        ),
      },
    ];

    if (canManage) {
      cols.push({
        id: "actions",
        header: "",
        width: "60px",
        headerClassName: "sr-only",
        cellClassName: "justify-self-end",
        cell: (member) => (
          <RowActionsMenu
            changeRoleHeading="Change event role"
            currentRole={member.role}
            roles={roles.map((role) => ({
              value: role,
              label: eventRoleLabel(role),
            }))}
            disabled={pending}
            removeLabel="Remove from event"
            onSelectRole={(role) => {
              setError(null);
              const formData = new FormData();
              formData.set("userId", member.userId);
              formData.set("role", role);
              start(async () => {
                try {
                  await changeEventStaffRole(orgSlug, eventId, formData);
                  toast.success(
                    `Role updated to ${eventRoleLabel(role as EventRole)}.`,
                  );
                  router.refresh();
                } catch (e) {
                  const message =
                    e instanceof Error
                      ? e.message
                      : "Could not change event role";
                  setError(message);
                  toast.error(message);
                }
              });
            }}
            onRemove={() => {
              setError(null);
              const formData = new FormData();
              formData.set("userId", member.userId);
              start(async () => {
                try {
                  await removeEventStaff(orgSlug, eventId, formData);
                  toast.success("Staff removed from the event.");
                  router.refresh();
                } catch (e) {
                  const message =
                    e instanceof Error
                      ? e.message
                      : "Could not remove event role";
                  setError(message);
                  toast.error(message);
                }
              });
            }}
          />
        ),
      });
    }

    return cols;
  }, [canManage, eventId, orgSlug, pending, router, toast]);

  return (
    <div className="space-y-6">
      {canManage ? (
        <>
          <PageHeader
            eyebrow="Event operations"
            title="Event staff access"
            titleAs="h2"
            description={
              <>
                Assign people who have already signed in. For check-in only access,
                do <span className="font-semibold text-slate-700">not</span> add them as organisation
                owners/admins — assign Check-in staff here so they land on Event day.
              </>
            }
            actions={
              <Button type="button" leadingIcon="plus" onClick={() => setOpen(true)}>
                Assign staff
              </Button>
            }
          />
          <Drawer
            open={open}
            onClose={() => setOpen(false)}
            title="Assign event staff"
            description="Grant a scoped event role. Check-in staff only need a signed-in account — not organisation admin membership."
          >
            <form
              className="space-y-4"
              action={(formData) => {
                setError(null);
                const email = String(formData.get("email") ?? "").trim();
                if (!isValidEmail(email)) {
                  const message = "Enter a valid email address.";
                  setError(message);
                  toast.error(message);
                  return;
                }
                start(async () => {
                  const result = await assignEventStaff(orgSlug, eventId, formData);
                  if (!result.ok) {
                    setError(result.error);
                    toast.error(result.error);
                    return;
                  }
                  if (result.data?.orgAdminWarning) {
                    toast.success(
                      "Staff assigned — but they are still an organisation owner/admin, so they keep full organiser access. Remove them under Organisation settings → Members for check-in-only access.",
                    );
                  } else {
                    toast.success(
                      "Staff assigned. They will see an Event day workspace after refresh.",
                    );
                  }
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              <div>
                <Label htmlFor="staff-email">Staff email</Label>
                <Input
                  id="staff-email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  They must create an account with this email first.
                </p>
              </div>
              <div>
                <Label htmlFor="staff-role">Event role</Label>
                <Select
                  id="staff-role"
                  name="role"
                  defaultValue="CHECKIN_STAFF"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {eventRoleLabel(role)}
                    </option>
                  ))}
                </Select>
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div className="flex justify-end">
                <Button disabled={pending}>
                  {pending ? "Assigning…" : "Assign role"}
                </Button>
              </div>
            </form>
          </Drawer>
        </>
      ) : null}

      {error && !open ? <p className="text-sm text-danger">{error}</p> : null}

      <DataTable
        rows={staff}
        columns={columns}
        getRowId={(member) => member.userId}
        searchPlaceholder="Search staff…"
        searchFilter={(member, query) => {
          const haystack = [
            displayName(member),
            member.email,
            eventRoleLabel(member.role),
            member.orgRole ? humanizeEnum(member.orgRole) : "no org role",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        }}
        emptyMessage="No scoped event staff assignments yet."
        minRowHeight="double"
      />
    </div>
  );
}
