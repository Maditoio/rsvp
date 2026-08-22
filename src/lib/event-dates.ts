import { eachCalendarDayInRange } from "@/lib/timezone";

export type EventDayOption = {
  value: string;
  label: string;
};

export function eventDayOptions(
  startsAt: Date | null,
  endsAt: Date | null,
  timezone: string,
): EventDayOption[] {
  if (!startsAt || !endsAt) return [];
  const days = eachCalendarDayInRange(startsAt, endsAt, timezone);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  });

  return days.map((day) => {
    const value = `${String(day.year).padStart(4, "0")}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
    const label = formatter.format(
      new Date(Date.UTC(day.year, day.month - 1, day.day, 12, 0)),
    );
    return { value, label };
  });
}
