/** Calendar helpers for a specific IANA timezone (no extra dependencies). */

export function calendarDateInTimezone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

export function utcFromZonedDateTime(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timeZone: string,
): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  function offsetMs(at: number) {
    const parts = formatter.formatToParts(new Date(at));
    const read = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(
      read("year"),
      read("month") - 1,
      read("day"),
      read("hour"),
      read("minute"),
    );
    return asUtc - at;
  }

  let utc = Date.UTC(year, month - 1, day, hours, minutes);
  for (let i = 0; i < 3; i++) {
    utc = Date.UTC(year, month - 1, day, hours, minutes) - offsetMs(utc);
  }
  return new Date(utc);
}

export function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
  timeZone: string,
): { year: number; month: number; day: number } {
  const next = utcFromZonedDateTime(year, month, day, 12, 0, timeZone);
  next.setUTCDate(next.getUTCDate() + days);
  return calendarDateInTimezone(next, timeZone);
}

export function compareCalendarDates(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function eachCalendarDayInRange(
  rangeStart: Date,
  rangeEnd: Date,
  timeZone: string,
): { year: number; month: number; day: number }[] {
  const start = calendarDateInTimezone(rangeStart, timeZone);
  const end = calendarDateInTimezone(rangeEnd, timeZone);
  const days: { year: number; month: number; day: number }[] = [];
  let current = start;

  while (compareCalendarDates(current, end) <= 0) {
    days.push(current);
    current = addCalendarDays(current.year, current.month, current.day, 1, timeZone);
  }

  return days;
}

const DATETIME_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

/** Format a UTC instant for `<input type="datetime-local">` in an IANA timezone. */
export function toDatetimeLocalValue(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  let hour = read("hour");
  if (hour === "24") hour = "00";

  return `${read("year")}-${read("month")}-${read("day")}T${hour}:${read("minute")}`;
}

/** Parse a datetime-local string as wall-clock time in an IANA timezone. */
export function parseDatetimeLocalValue(
  value: string,
  timeZone: string,
): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(DATETIME_LOCAL_RE);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  if ([year, month, day, hours, minutes].some((n) => Number.isNaN(n))) {
    return null;
  }

  return utcFromZonedDateTime(year, month, day, hours, minutes, timeZone);
}
