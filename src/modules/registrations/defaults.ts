export const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "tel",
  "date",
  "select",
  "radio",
  "checkbox",
  "multiselect",
  "country",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export type FormFieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  sortOrder: number;
};

export const LOCKED_FIELD_KEYS = ["firstName", "lastName", "email"] as const;

export const DEFAULT_REGISTRATION_FIELDS: FormFieldDef[] = [
  { key: "firstName", label: "First name", type: "text", required: true, sortOrder: 0 },
  { key: "lastName", label: "Last name", type: "text", required: true, sortOrder: 1 },
  { key: "email", label: "Email", type: "email", required: true, sortOrder: 2 },
  { key: "phone", label: "Phone", type: "tel", required: false, sortOrder: 3 },
  { key: "company", label: "Company", type: "text", required: false, sortOrder: 4 },
  { key: "jobTitle", label: "Job title", type: "text", required: false, sortOrder: 5 },
  { key: "industry", label: "Industry", type: "text", required: false, sortOrder: 6 },
  { key: "country", label: "Country", type: "country", required: false, sortOrder: 7 },
  { key: "website", label: "Website", type: "text", required: false, sortOrder: 8 },
  { key: "attendanceDates", label: "Attendance dates", type: "text", required: false, sortOrder: 9 },
  { key: "dietary", label: "Dietary requirements", type: "textarea", required: false, sortOrder: 10 },
  { key: "accessibility", label: "Accessibility requirements", type: "textarea", required: false, sortOrder: 11 },
  { key: "accommodation", label: "Accommodation", type: "text", required: false, sortOrder: 12 },
  { key: "airportTransfer", label: "Airport transfer", type: "text", required: false, sortOrder: 13 },
  { key: "notes", label: "Notes for the organiser", type: "textarea", required: false, sortOrder: 14 },
];
