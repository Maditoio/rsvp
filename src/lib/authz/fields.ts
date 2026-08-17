export type CheckInView = {
  attendeeId: string;
  name: string;
  company: string | null;
  category: string | null;
  alreadyCheckedIn: boolean;
  checkedInAt: Date | null;
};

export function maskAttendeeForCheckIn(input: {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  category: { name: string } | null;
  checkIns: { checkedInAt: Date }[];
}): CheckInView {
  const last = input.checkIns[0] ?? null;
  return {
    attendeeId: input.id,
    name: `${input.firstName} ${input.lastName}`.trim(),
    company: input.company,
    category: input.category?.name ?? null,
    alreadyCheckedIn: Boolean(last),
    checkedInAt: last?.checkedInAt ?? null,
  };
}
