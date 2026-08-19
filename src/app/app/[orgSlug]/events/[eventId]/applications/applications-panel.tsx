"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye } from "lucide-react";
import { decideApplication } from "@/modules/applications/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Table, Td, Th } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { displayName, humanizeEnum } from "@/lib/utils";

type ApplicationRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle: string | null;
  country: string | null;
  message: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

export function ApplicationsPanel({
  orgSlug,
  eventId,
  applications,
  canDecide,
}: {
  orgSlug: string;
  eventId: string;
  applications: ApplicationRow[];
  canDecide: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ApplicationRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Public applications
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink-800">Applications</h1>
        <p className="mt-1 text-sm text-stone-700">
          Approving creates an invitation. Rejected applicants do not gain event
          access.
        </p>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Applicant</Th>
            <Th>Organisation</Th>
            <Th>Status</Th>
            <Th>Submitted</Th>
            {canDecide ? <Th></Th> : null}
          </tr>
        </thead>
        <tbody>
          {applications.map((row) => (
            <tr key={row.id}>
              <Td>
                <p className="font-medium text-ink-800">{displayName(row)}</p>
                <p className="text-xs text-stone-500">{row.email}</p>
              </Td>
              <Td className="text-stone-700">
                {[row.jobTitle, row.company].filter(Boolean).join(" · ") || "—"}
              </Td>
              <Td>
                <StatusBadge status={row.status} />
              </Td>
              <Td className="text-stone-700">{row.createdAt}</Td>
              {canDecide ? (
                <Td>
                  <button
                    type="button"
                    title="Review application"
                    className="rounded-sm p-1.5 text-stone-500 hover:bg-stone-100 hover:text-ink-700"
                    onClick={() => {
                      setCurrent(row);
                      setError(null);
                      setOpen(true);
                    }}
                  >
                    <Eye className="size-4" />
                  </button>
                </Td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </Table>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Review application"
        description="Approve to issue an invitation, or reject without granting access."
      >
        {current ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              start(async () => {
                try {
                  await decideApplication(orgSlug, eventId, formData);
                  setOpen(false);
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not update application");
                }
              });
            }}
          >
            <input type="hidden" name="applicationId" value={current.id} />
            <p className="font-medium text-ink-800">{displayName(current)}</p>
            <p className="text-sm text-stone-700">{current.email}</p>
            {current.message ? (
              <p className="text-sm text-stone-700">{current.message}</p>
            ) : null}
            {current.status === "PENDING" ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="rounded-sm border border-stone-200 p-3 text-sm">
                  <input type="radio" name="decision" value="approve" required className="mr-2" />
                  Approve
                </label>
                <label className="rounded-sm border border-stone-200 p-3 text-sm">
                  <input type="radio" name="decision" value="reject" required className="mr-2" />
                  Reject
                </label>
              </div>
            ) : (
              <p className="text-sm text-stone-700">Already {humanizeEnum(current.status)}.</p>
            )}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {current.status === "PENDING" ? (
              <div className="flex justify-end">
                <Button disabled={pending}>{pending ? "Saving…" : "Record decision"}</Button>
              </div>
            ) : null}
          </form>
        ) : null}
      </Drawer>
    </div>
  );
}
