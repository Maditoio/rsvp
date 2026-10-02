import {
  formatAnswerValue,
  type RegistrationAnswers,
} from "@/modules/registrations/answers";

export function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function registrationExportHeaders(
  fields: Array<{ key: string; label: string }>,
) {
  const base = ["status", "submittedAt", "invitationStatus"];
  const dynamic = fields.map((field) => field.label || field.key);
  return [...base, ...dynamic];
}

export function registrationExportRow(
  fields: Array<{ key: string; label: string }>,
  row: {
    status: string;
    submittedAt: string;
    invitationStatus: string;
    data: unknown;
  },
) {
  const data =
    row.data && typeof row.data === "object" && !Array.isArray(row.data)
      ? (row.data as RegistrationAnswers)
      : {};
  return [
    row.status,
    row.submittedAt,
    row.invitationStatus,
    ...fields.map((field) => formatAnswerValue(data[field.key])),
  ];
}
