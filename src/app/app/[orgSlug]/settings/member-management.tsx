"use client";

import type { OrgRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  addOrganisationMember,
  changeOrganisationMemberRole,
  removeOrganisationMember,
} from "@/modules/access/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, Td, Th } from "@/components/ui/table";
import { displayName, humanizeEnum } from "@/lib/utils";

const roles: OrgRole[] = ["OWNER", "ADMIN"];

const selectClassName =
  "h-10 rounded-sm border border-stone-300 bg-stone-0 px-3 text-sm text-ink-700 outline-none focus:border-ink-700 focus:ring-3 focus:ring-ink-700/12";

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
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const ownerCount = useMemo(
    () => members.filter((member) => member.role === "OWNER").length,
    [members],
  );

  return (
    <div className="space-y-6">
      {canManage ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-heading text-[1.125rem] font-semibold text-ink-700">
              Organisation members
            </h2>
            <p className="mt-1 text-[0.9375rem] text-stone-700">
              Add existing signed-in users by email. Access is always scoped to
              your current organisation on the server.
            </p>
          </div>
          <Button type="button" onClick={() => setOpen(true)}>
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
                start(async () => {
                  try {
                    await addOrganisationMember(orgSlug, formData);
                    setOpen(false);
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not add member");
                  }
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
                <select
                  id="member-role"
                  name="role"
                  defaultValue="ADMIN"
                  className={selectClassName}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {humanizeEnum(role)}
                    </option>
                  ))}
                </select>
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
          <h2 className="text-heading text-[1.125rem] font-semibold text-ink-700">
            Organisation members
          </h2>
          <p className="mt-1 text-[0.9375rem] text-stone-700">
            Your current role can view members but cannot change organisation
            access.
          </p>
        </div>
      )}

      <Table>
        <thead>
          <tr>
            <Th>Member</Th>
            <Th>Role</Th>
            <Th>Joined</Th>
            {canManage ? <Th>Actions</Th> : null}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const disableOwnerDowngrade =
              member.role === "OWNER" && ownerCount <= 1;

            return (
              <tr key={member.userId} className="border-b border-stone-100">
                <Td>
                  <p className="font-medium text-ink-800">
                    {displayName(member)}
                    {member.isCurrentUser ? " (you)" : ""}
                  </p>
                  <p className="text-xs text-stone-500">{member.email}</p>
                </Td>
                <Td className="text-stone-700">{humanizeEnum(member.role)}</Td>
                <Td className="whitespace-nowrap text-stone-700">{member.joinedAt}</Td>
                {canManage ? (
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <form
                        className="flex flex-wrap items-center gap-2"
                        action={(formData) => {
                          setError(null);
                          start(async () => {
                            try {
                              await changeOrganisationMemberRole(orgSlug, formData);
                              router.refresh();
                            } catch (e) {
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : "Could not change member role",
                              );
                            }
                          });
                        }}
                      >
                        <input type="hidden" name="userId" value={member.userId} />
                        <select
                          name="role"
                          defaultValue={member.role}
                          className={selectClassName}
                        >
                          {roles.map((role) => (
                            <option
                              key={role}
                              value={role}
                              disabled={role !== "OWNER" && disableOwnerDowngrade}
                            >
                              {humanizeEnum(role)}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" variant="secondary" disabled={pending}>
                          Save role
                        </Button>
                      </form>
                      <form
                        action={(formData) => {
                          setError(null);
                          start(async () => {
                            try {
                              await removeOrganisationMember(orgSlug, formData);
                              router.refresh();
                            } catch (e) {
                              setError(
                                e instanceof Error
                                  ? e.message
                                  : "Could not remove member",
                              );
                            }
                          });
                        }}
                      >
                        <input type="hidden" name="userId" value={member.userId} />
                        <Button size="sm" variant="ghost" disabled={pending}>
                          Remove
                        </Button>
                      </form>
                    </div>
                  </Td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </Table>
      {members.length === 0 ? (
        <p className="text-sm text-stone-700">No members yet.</p>
      ) : null}
    </div>
  );
}
