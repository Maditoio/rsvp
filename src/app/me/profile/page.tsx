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
      <h1 className="font-display text-4xl text-gray-800">My profile</h1>
      <Card>
        <p className="text-xs uppercase tracking-[0.18em] text-bloom-700">
          Name
        </p>
        <p className="mt-2 font-display text-3xl text-gray-800">
          {displayName(user)}
        </p>
        <p className="mt-4 text-sm text-gray-500">Company</p>
        <p className="text-gray-800">
          {companies[0] || attendances[0]?.company || "Not provided yet"}
        </p>
        {attendances[0]?.jobTitle ? (
          <>
            <p className="mt-4 text-sm text-gray-500">Role</p>
            <p className="text-gray-800">{attendances[0].jobTitle}</p>
          </>
        ) : null}
      </Card>
      <Card className="bg-gray-100">
        <p className="text-sm font-medium text-gray-500">Looking for / offering</p>
        <p className="mt-1 text-sm text-gray-400">
          Richer attendee profiles land in a later phase.
        </p>
      </Card>
    </div>
  );
}
