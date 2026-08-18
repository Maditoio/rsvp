import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { listMyAttendances } from "@/modules/attendees/actions";
import { displayName } from "@/lib/utils";

export default async function AttendeeProfilePage() {
  const user = await safe(() => requireUser());
  const attendances = await safe(() => listMyAttendances());
  const companies = [
    ...new Set(attendances.map((row) => row.company).filter(Boolean)),
  ] as string[];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-ink-800">My profile</h1>
      <Card>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
          Name
        </p>
        <p className="mt-2 font-display text-3xl text-ink-800">
          {displayName(user)}
        </p>
        <p className="mt-4 text-sm text-stone-500">Company</p>
        <p className="text-ink-800">
          {companies[0] || attendances[0]?.company || "Not provided yet"}
        </p>
        {attendances[0]?.jobTitle ? (
          <>
            <p className="mt-4 text-sm text-stone-500">Role</p>
            <p className="text-ink-800">{attendances[0].jobTitle}</p>
          </>
        ) : null}
      </Card>
      <Card>
        <p className="text-sm font-medium text-ink-800">Event profiles</p>
        <p className="mt-1 text-sm text-stone-700">
          Looking for, offering, and privacy are set per event.
        </p>
        <ul className="mt-4 space-y-2">
          {attendances.length === 0 ? (
            <li className="text-sm text-stone-500">No registered events yet.</li>
          ) : (
            attendances.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/me/events/${row.event.id}/profile`}
                  className="text-sm text-ink-700 underline"
                >
                  {row.event.name}
                </Link>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
