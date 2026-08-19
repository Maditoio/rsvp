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
