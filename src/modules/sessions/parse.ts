import { z } from "zod";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import type { SessionFormat } from "@prisma/client";
import {
  parseDatetimeLocalValue,
  utcFromZonedDateTime,
} from "@/lib/timezone";

export const SESSION_TEMPLATE_HEADERS = [
  "Title",
  "Description",
  "Start datetime",
  "End datetime",
  "Location",
  "Track",
  "Speaker names",
  "Format",
] as const;

export const SESSION_IMPORT_FIELD_KEYS = [
  "title",
  "description",
  "startsAt",
  "endsAt",
  "location",
  "track",
  "speakers",
  "format",
  "ignore",
] as const;

export type SessionImportFieldKey = (typeof SESSION_IMPORT_FIELD_KEYS)[number];

export type SessionColumnMap = Record<string, SessionImportFieldKey>;

const FIELD_ALIASES: Record<
  Exclude<SessionImportFieldKey, "ignore">,
  string[]
> = {
  title: ["title", "session", "session title", "name"],
  description: ["description", "details", "abstract", "summary"],
  startsAt: [
    "start datetime",
    "start date",
    "start time",
    "starts",
    "starts at",
    "start",
  ],
  endsAt: ["end datetime", "end date", "end time", "ends", "ends at", "end"],
  location: ["location", "room", "venue", "location/room"],
  track: ["track", "stream", "theme"],
  speakers: ["speaker names", "speakers", "speaker", "presenters"],
  format: ["format", "session format", "type"],
};

export type SessionImportRow = {
  line: number;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  format: SessionFormat;
};

export type SessionImportIssue = {
  line: number;
  title?: string;
  reason:
    | "missing_title"
    | "invalid_title"
    | "missing_times"
    | "invalid_times"
    | "invalid_format"
    | "duplicate_in_file";
  message: string;
};

export type SessionImportPreview = {
  valid: SessionImportRow[];
  issues: SessionImportIssue[];
};

type SheetRow = Record<string, unknown>;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function guessSessionColumnMap(headers: string[]): SessionColumnMap {
  const map: SessionColumnMap = {};
  const used = new Set<Exclude<SessionImportFieldKey, "ignore">>();

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    let matched: Exclude<SessionImportFieldKey, "ignore"> | "ignore" = "ignore";
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
      Exclude<SessionImportFieldKey, "ignore">,
      string[],
    ][]) {
      if (used.has(field)) continue;
      if (aliases.some((alias) => alias === normalized)) {
        matched = field;
        used.add(field);
        break;
      }
    }
    map[header] = matched;
  }
  return map;
}

function cellFromMapped(
  row: SheetRow,
  map: SessionColumnMap,
  field: Exclude<SessionImportFieldKey, "ignore">,
) {
  for (const [header, mapped] of Object.entries(map)) {
    if (mapped !== field) continue;
    const value = row[header];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

/** Parse spreadsheet datetime cells (ISO, UK, or Excel serial). */
export function parseSessionDatetime(
  value: string,
  timeZone?: string,
): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = Number.parseFloat(trimmed);
    if (!Number.isFinite(serial)) return null;
    const ms = (serial - 25569) * 86_400_000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (timeZone) {
    const isoLike = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/,
    );
    if (isoLike) {
      const date = utcFromZonedDateTime(
        Number(isoLike[1]),
        Number(isoLike[2]),
        Number(isoLike[3]),
        Number(isoLike[4]),
        Number(isoLike[5]),
        timeZone,
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const uk = trimmed.match(
      /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/,
    );
    if (uk) {
      const [, day, month, year, hour = "0", minute = "0"] = uk;
      const date = utcFromZonedDateTime(
        Number(year),
        Number(month),
        Number(day),
        Number(hour),
        Number(minute),
        timeZone,
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const local = parseDatetimeLocalValue(trimmed.replace(" ", "T"), timeZone);
    if (local) return local;
  }

  const iso = trimmed.replace(" ", "T");
  const direct = new Date(iso);
  if (!Number.isNaN(direct.getTime())) return direct;

  const uk = trimmed.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/,
  );
  if (uk) {
    const [, day, month, year, hour = "0", minute = "0"] = uk;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseSessionFormat(raw: string): SessionFormat | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return "PHYSICAL";
  if (["physical", "in person", "in-person", "onsite", "on-site"].includes(normalized)) {
    return "PHYSICAL";
  }
  if (["online", "virtual", "remote"].includes(normalized)) {
    return "ONLINE";
  }
  if (["hybrid", "blended"].includes(normalized)) {
    return "HYBRID";
  }
  return null;
}

function combineLocation(location: string, track: string) {
  if (location && track) return `${location} · ${track}`;
  return location || track || null;
}

function combineDescription(description: string, speakers: string) {
  const base = description.trim();
  const names = speakers.trim();
  if (!names) return base || null;
  const speakersLine = `Speakers: ${names}`;
  if (!base) return speakersLine;
  return `${base}\n\n${speakersLine}`;
}

const sessionImportRowSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(160),
  description: z.string().max(2000).nullable(),
  location: z.string().max(160).nullable(),
  startsAt: z.date().nullable(),
  endsAt: z.date().nullable(),
  format: z.enum(["PHYSICAL", "ONLINE", "HYBRID"]),
});

export function previewSessionImport(
  rows: SheetRow[],
  columnMap?: SessionColumnMap,
  timeZone?: string,
): SessionImportPreview {
  const valid: SessionImportRow[] = [];
  const issues: SessionImportIssue[] = [];
  const seen = new Set<string>();
  const headers = rows.length > 0 ? Object.keys(rows[0]!) : [];
  const map = columnMap ?? guessSessionColumnMap(headers);

  rows.forEach((row, index) => {
    const line = index + 2;
    const title = cellFromMapped(row, map, "title");
    const descriptionRaw = cellFromMapped(row, map, "description");
    const locationRaw = cellFromMapped(row, map, "location");
    const track = cellFromMapped(row, map, "track");
    const speakers = cellFromMapped(row, map, "speakers");
    const startsRaw = cellFromMapped(row, map, "startsAt");
    const endsRaw = cellFromMapped(row, map, "endsAt");
    const formatRaw = cellFromMapped(row, map, "format");

    if (!title) {
      issues.push({
        line,
        reason: "missing_title",
        message: "Title is required.",
      });
      return;
    }

    const format = parseSessionFormat(formatRaw);
    if (!format) {
      issues.push({
        line,
        title,
        reason: "invalid_format",
        message: "Format must be Physical, Online, or Hybrid.",
      });
      return;
    }

    const startsAt = startsRaw ? parseSessionDatetime(startsRaw, timeZone) : null;
    const endsAt = endsRaw ? parseSessionDatetime(endsRaw, timeZone) : null;

    if ((startsRaw && !startsAt) || (endsRaw && !endsAt)) {
      issues.push({
        line,
        title,
        reason: "invalid_times",
        message: "Enter valid start and end datetimes.",
      });
      return;
    }

    if ((startsRaw && !endsRaw) || (!startsRaw && endsRaw)) {
      issues.push({
        line,
        title,
        reason: "missing_times",
        message: "Provide both start and end datetimes, or leave both blank.",
      });
      return;
    }

    if (startsAt && endsAt && endsAt <= startsAt) {
      issues.push({
        line,
        title,
        reason: "invalid_times",
        message: "End datetime must be after start datetime.",
      });
      return;
    }

    const parsed = sessionImportRowSchema.safeParse({
      title,
      description: combineDescription(descriptionRaw, speakers),
      location: combineLocation(locationRaw, track),
      startsAt,
      endsAt,
      format,
    });

    if (!parsed.success) {
      issues.push({
        line,
        title,
        reason: "invalid_title",
        message: parsed.error.issues[0]?.message ?? "Invalid row.",
      });
      return;
    }

    const dedupeKey = `${parsed.data.title.toLowerCase()}|${startsAt?.toISOString() ?? ""}`;
    if (seen.has(dedupeKey)) {
      issues.push({
        line,
        title,
        reason: "duplicate_in_file",
        message: "Duplicate session in file (same title and start time).",
      });
      return;
    }
    seen.add(dedupeKey);

    valid.push({
      line,
      ...parsed.data,
    });
  });

  return { valid, issues };
}

export async function parseSessionImportFile(file: File): Promise<SheetRow[]> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const header: string[] = [];
    const rows: SheetRow[] = [];
    sheet.eachRow((row, index) => {
      const values = (row.values as unknown[]).slice(1).map((v) => String(v ?? ""));
      if (index === 1) {
        header.push(...values);
        return;
      }
      const obj: SheetRow = {};
      header.forEach((h, i) => {
        obj[h] = values[i];
      });
      rows.push(obj);
    });
    return rows;
  }

  const text = buffer.toString("utf8");
  const parsed = Papa.parse<SheetRow>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data;
}

export function sessionTemplateCsv(): string {
  const header = SESSION_TEMPLATE_HEADERS.join(",");
  const example = [
    "Opening keynote",
    "Welcome and overview",
    "2026-11-14 09:00",
    "2026-11-14 10:00",
    "Main Hall",
    "Plenary",
    "Jane Smith; John Doe",
    "Hybrid",
  ]
    .map((cell) => `"${cell.replace(/"/g, '""')}"`)
    .join(",");
  return `${header}\n${example}\n`;
}
