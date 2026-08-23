"use client";

import type { OrgRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  addOrganisationMember,
  changeOrganisationMemberRole,
  removeOrganisationMember,
} from "@/modules/access/actions";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { RowActionsMenu } from "@/components/data-table/row-actions-menu";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OrgRoleTag } from "@/components/ui/role-tag";
import { displayName, humanizeEnum } from "@/lib/utils";
import { isValidEmail } from "@/lib/validation";
import { useToast } from "@/components/ui/toast";

const roles: OrgRole[] = ["OWNER", "ADMIN"];

type Member = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: OrgRole;
  joinedAt: string;
  isCurrentUser: boolean;
};

export function MemberManagement({
  orgSlug,
  members,
  canManage,
}: {
  orgSlug: string;
  members: Member[];
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const ownerCount = useMemo(
    () => members.filter((member) => member.role === "OWNER").length,
    [members],
  );

  const columns = useMemo<DataTableColumn<Member>[]>(() => {
    const cols: DataTableColumn<Member>[] = [
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
        id: "role",
        header: "Role",
        width: "1.2fr",
        cell: (member) => <OrgRoleTag role={member.role} />,
      },
      {
        id: "joined",
        header: "Joined",
        width: "1fr",
        cell: (member) => (
          <span className="whitespace-nowrap">{member.joinedAt}</span>
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
        cell: (member) => {
          const disableOwnerDowngrade =
            member.role === "OWNER" && ownerCount <= 1;

          return (
            <RowActionsMenu
              changeRoleHeading="Change role"
              currentRole={member.role}
              roles={roles.map((role) => ({
                value: role,
                label: humanizeEnum(role),
                disabled: role !== "OWNER" && disableOwnerDowngrade,
              }))}
              disabled={pending}
              removeDisabled={disableOwnerDowngrade && member.role === "OWNER"}
              removeLabel="Remove from organisation"
              onSelectRole={(role) => {
                setError(null);
                const formData = new FormData();
                formData.set("userId", member.userId);
                formData.set("role", role);
                start(async () => {
                  try {
                    await changeOrganisationMemberRole(orgSlug, formData);
                    toast.success(`Role updated to ${humanizeEnum(role)}.`);
                    router.refresh();
                  } catch (e) {
                    const message =
                      e instanceof Error
                        ? e.message
                        : "Could not change member role";
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
                  const result = await removeOrganisationMember(orgSlug, formData);
                  if (!result.ok) {
                    setError(result.error);
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Member removed from the organisation.");
                  router.refresh();
                });
              }}
            />
          );
        },
      });
    }

    return cols;
  }, [canManage, orgSlug, ownerCount, pending, router, toast]);

  return (
    <div className="space-y-6">
      {canManage ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-heading text-[1.125rem] font-semibold text-slate-700">
              Organisation members
            </h2>
            <p className="mt-1 text-[0.8125rem] text-slate-500">
              Owners and admins can manage the whole organisation. For event-day
              check-in helpers, use Event → Staff → Check-in staff instead — do not
              add them here.
            </p>
          </div>
          <Button type="button" leadingIcon="plus" onClick={() => setOpen(true)}>
            Add member
          </Button>
          <Drawer
            open={open}
            onClose={() => setOpen(false)}
            title="Add organisation member"
            description="Grant organisation access to an existing signed-in user."
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
                  const result = await addOrganisationMember(orgSlug, formData);
                  if (!result.ok) {
                    setError(result.error);
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Member added.");
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              <div>
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="member-role">Role</Label>
                <Select id="member-role" name="role" defaultValue="ADMIN">
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {humanizeEnum(role)}
                    </option>
                  ))}
                </Select>
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div className="flex justify-end">
                <Button disabled={pending}>{pending ? "Adding…" : "Add member"}</Button>
              </div>
            </form>
          </Drawer>
        </div>
      ) : (
        <div>
          <h2 className="text-heading text-[1.125rem] font-semibold text-slate-700">
            Organisation members
          </h2>
          <p className="mt-1 text-[0.8125rem] text-slate-500">
            Your current role can view members but cannot change organisation
            access.
          </p>
        </div>
      )}

      {error && !open ? <p className="text-sm text-danger">{error}</p> : null}

      <DataTable
        rows={members}
        columns={columns}
        getRowId={(member) => member.userId}
        searchPlaceholder="Search members…"
        searchFilter={(member, query) => {
          const haystack = [
            displayName(member),
            member.email,
            humanizeEnum(member.role),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(query);
        }}
        emptyMessage="No members yet."
        minRowHeight="double"
      />
    </div>
  );
}
