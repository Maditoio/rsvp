export const PUBLIC_ATTENDANCE_TYPES = [
  { slug: "delegate", name: "Delegate" },
  { slug: "media", name: "Media" },
  { slug: "exhibitor", name: "Exhibitor" },
  { slug: "other", name: "Other" },
] as const;

export type PublicAttendanceSlug =
  (typeof PUBLIC_ATTENDANCE_TYPES)[number]["slug"];

const PUBLIC_ATTENDANCE_SLUGS = new Set<string>(
  PUBLIC_ATTENDANCE_TYPES.map((t) => t.slug),
);

export function isPublicAttendanceSlug(
  value: string,
): value is PublicAttendanceSlug {
  return PUBLIC_ATTENDANCE_SLUGS.has(value);
}

export function publicAttendanceLabel(slug: string): string | null {
  return PUBLIC_ATTENDANCE_TYPES.find((t) => t.slug === slug)?.name ?? null;
}
