import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listMyAttendances } from "@/modules/attendees/actions";
import { formatEventWindow } from "@/lib/utils";
import { safe } from "@/lib/authz/safe";

function statusTone(status: string) {
  if (status === "CHECKED_IN") return "success" as const;
  if (status === "CONFIRMED") return "default" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "muted" as const;
}

function statusLabel(status: string) {
  if (status === "CHECKED_IN") return "Checked in";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "NO_SHOW") return "No show";
  if (status === "CANCELLED") return "Cancelled";
  return "Registered";
}

export default async function AttendeeHomePage() {
  const attendances = await safe(() => listMyAttendances());

  return (
    <div>
      <h1 className="font-display text-4xl text-gray-800">My events</h1>
      <p className="mt-2 text-gray-600">
        Registration records linked to your signed-in account.
      </p>
      <div className="mt-8 space-y-3">
        {attendances.length === 0 ? (
          <Card>
            <p className="text-gray-600">
              You are not registered for an event yet. Use the unique link from
              your invitation email — accepting is not the same as registering.
            </p>
          </Card>
        ) : (
          attendances.map((row) => (
            <Link key={row.id} href={`/me/events/${row.event.id}`}>
              <Card className="hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-medium text-gray-800">
                      {row.event.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {row.event.venue || "Venue TBC"} ·{" "}
                      {formatEventWindow(
                        row.event.startsAt,
                        row.event.endsAt,
                        row.event.timezone,
                      )}
                    </p>
                  </div>
                  <Badge tone={statusTone(row.status)}>
                    {statusLabel(row.status)}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {["Matchmaking", "Meetings", "Agenda", "Privacy"].map((label) => (
          <Card key={label} className="bg-gray-100">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-1 text-sm text-gray-400">Available in a later phase.</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
