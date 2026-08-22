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
import { isValidEmail } from "@/lib/validation";
import { useToast } from "@/components/ui/toast";

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
  const toast = useToast();
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
              Assign people who have already signed in. For check-in only access,
              do <span className="font-semibold">not</span> add them as organisation
              owners/admins — assign Check-in staff here so they land on Event day.
            </p>
          </div>
          <Button type="button" onClick={() => setOpen(true)}>
            Assign staff
          </Button>
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
                <p className="mt-1 text-xs text-stone-500">
                  They must create an account with this email first.
                </p>
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
