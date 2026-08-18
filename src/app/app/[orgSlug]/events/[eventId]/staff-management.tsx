"use client";

import type { EventRole, OrgRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  assignEventStaff,
  changeEventStaffRole,
  removeEventStaff,
} from "@/modules/access/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, Td, Th } from "@/components/ui/table";
import { displayName, humanizeEnum } from "@/lib/utils";

const roles: EventRole[] = [
  "EVENT_ADMINISTRATOR",
  "REGISTRATION_MANAGER",
  "CHECKIN_STAFF",
];

const selectClassName =
  "h-10 rounded-sm border border-stone-300 bg-stone-0 px-3 text-sm text-ink-700 outline-none focus:border-ink-700 focus:ring-3 focus:ring-ink-700/12";

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
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      {canManage ? (
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
              Event operations
            </p>
            <h2 className="mt-1 font-display text-2xl text-ink-800">Event staff access</h2>
            <p className="mt-1 text-sm text-stone-700">
              Grant scoped event roles to existing organisation members only.
            </p>
          </div>
          <Button type="button" onClick={() => setOpen(true)}>
            Assign staff
          </Button>
          <Drawer
            open={open}
            onClose={() => setOpen(false)}
            title="Assign event staff"
            description="Grant a scoped event role to an existing organisation member."
          >
            <form
              className="space-y-4"
              action={(formData) => {
                setError(null);
                start(async () => {
                  try {
                    await assignEventStaff(orgSlug, eventId, formData);
                    setOpen(false);
                    router.refresh();
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Could not assign event staff",
                    );
                  }
                });
              }}
            >
              <div>
                <Label htmlFor="staff-email">Member email</Label>
                <Input
                  id="staff-email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="staff-role">Event role</Label>
                <select
                  id="staff-role"
                  name="role"
                  defaultValue="CHECKIN_STAFF"
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
                <Button disabled={pending}>
                  {pending ? "Assigning…" : "Assign role"}
                </Button>
              </div>
            </form>
          </Drawer>
        </div>
      ) : null}

      <Table>
        <thead>
          <tr className="border-b border-stone-200">
            <Th>Member</Th>
            <Th>Organisation role</Th>
            <Th>Event role</Th>
            <Th>Assigned</Th>
            {canManage ? <Th>Actions</Th> : null}
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.userId} className="border-b border-stone-100">
              <Td>
                <p className="font-medium text-ink-800">
                  {displayName(member)}
                  {member.isCurrentUser ? " (you)" : ""}
                </p>
                <p className="text-xs text-stone-500">{member.email}</p>
              </Td>
              <Td className="text-stone-700">
                {member.orgRole ? humanizeEnum(member.orgRole) : "No org role"}
              </Td>
              <Td>
                <Badge tone={member.role === "CHECKIN_STAFF" ? "muted" : "default"}>
                  {humanizeEnum(member.role)}
                </Badge>
              </Td>
              <Td className="whitespace-nowrap text-stone-700">{member.assignedAt}</Td>
              {canManage ? (
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    <form
                      className="flex flex-wrap items-center gap-2"
                      action={(formData) => {
                        setError(null);
                        start(async () => {
                          try {
                            await changeEventStaffRole(orgSlug, eventId, formData);
                            router.refresh();
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Could not change event role",
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
                          <option key={role} value={role}>
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
                            await removeEventStaff(orgSlug, eventId, formData);
                            router.refresh();
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Could not remove event role",
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
          ))}
        </tbody>
      </Table>
      {staff.length === 0 ? (
        <p className="text-sm text-stone-700">No scoped event staff assignments yet.</p>
      ) : null}
    </div>
  );
}
