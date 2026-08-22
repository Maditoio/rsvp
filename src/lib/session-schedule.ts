export function formatSessionSchedule(
  startsAt: Date | null,
  endsAt: Date | null,
  timezone: string,
) {
  if (!startsAt) {
    return {
      dateLabel: "Time to be confirmed",
      timeLabel: null as string | null,
    };
  }

  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(startsAt);

  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const startTime = timeFmt.format(startsAt);
  const endTime = endsAt ? timeFmt.format(endsAt) : null;
  const timeLabel = endTime ? `${startTime} – ${endTime}` : startTime;

  return { dateLabel, timeLabel };
}
