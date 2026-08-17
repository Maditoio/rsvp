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
      <h1 className="font-serif text-4xl text-slate-900">My profile</h1>
      <Card>
        <p className="text-xs uppercase tracking-[0.18em] text-accent-700">
          Name
        </p>
        <p className="mt-2 font-serif text-3xl text-slate-900">
          {displayName(user)}
        </p>
        <p className="mt-4 text-sm text-slate-500">Company</p>
        <p className="text-slate-800">
          {companies[0] || attendances[0]?.company || "Not provided yet"}
        </p>
        {attendances[0]?.jobTitle ? (
          <>
            <p className="mt-4 text-sm text-slate-500">Role</p>
            <p className="text-slate-800">{attendances[0].jobTitle}</p>
          </>
        ) : null}
      </Card>
      <Card className="bg-secondary-100">
        <p className="text-sm font-medium text-slate-500">Looking for / offering</p>
        <p className="mt-1 text-sm text-slate-400">
          Richer attendee profiles land in a later phase.
        </p>
      </Card>
    </div>
  );
}
