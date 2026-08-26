import "server-only";

import OpenAI from "openai";
import { z } from "zod";
import {
  isMapPoiCategory,
  MAP_POI_CATEGORIES,
  type MapPoiCategory,
} from "@/modules/venue/categories";
import type { DetectedPoiProposal } from "@/modules/venue/types";

export type { DetectedPoiProposal };

const detectionResponseSchema = z.object({
  locations: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        category: z.string().min(1),
        x: z.number(),
        y: z.number(),
        stand_code: z.string().max(40).optional().nullable(),
        confidence: z.number().min(0).max(1).optional().nullable(),
      }),
    )
    .max(400),
});

function openaiClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to enable Con·cierge floor mapping.",
    );
  }
  return new OpenAI({ apiKey: key });
}

function openaiVenueModel() {
  return (
    process.env.OPENAI_VENUE_MODEL?.trim() ||
    process.env.OPENAI_MATCH_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function normalizeCategory(raw: string): MapPoiCategory {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (isMapPoiCategory(key)) return key;
  const aliases: Record<string, MapPoiCategory> = {
    booth: "exhibitor_stand",
    stand: "exhibitor_stand",
    exhibitor: "exhibitor_stand",
    toilet: "toilet",
    restroom: "toilet",
    wc: "toilet",
    bathroom: "toilet",
    cafe: "coffee",
    cafeteria: "food",
    restaurant: "food",
    food_court: "food",
    stage: "main_stage",
    lobby: "entrance",
    door: "entrance",
    elevators: "lift",
    elevator: "lift",
    escalator: "stairs",
    info: "information",
    help_desk: "information",
  };
  return aliases[key] ?? "information";
}

/** Parse optional CSV: stand_code,name,category,hall */
export function parseStandListCsv(text: string): {
  standCode: string;
  name: string;
  category: MapPoiCategory | null;
}[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const split = (line: string) => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  const header = split(lines[0]!).map((h) => h.toLowerCase());
  const looksLikeHeader =
    header.includes("stand_code") ||
    header.includes("stand") ||
    header.includes("code") ||
    header.includes("name") ||
    header.includes("company");

  const rows = looksLikeHeader ? lines.slice(1) : lines;
  const idx = (names: string[]) =>
    names.reduce<number>((found, n) => {
      if (found >= 0) return found;
      return header.indexOf(n);
    }, -1);

  const codeIdx = looksLikeHeader
    ? idx(["stand_code", "stand", "code", "booth", "booth_code"])
    : 0;
  const nameIdx = looksLikeHeader
    ? idx(["name", "company", "exhibitor", "title"])
    : 1;
  const catIdx = looksLikeHeader ? idx(["category", "type"]) : 2;

  const out: {
    standCode: string;
    name: string;
    category: MapPoiCategory | null;
  }[] = [];

  for (const line of rows) {
    const cells = split(line);
    const standCode = (cells[codeIdx >= 0 ? codeIdx : 0] ?? "").trim();
    const name = (
      cells[nameIdx >= 0 ? nameIdx : Math.min(1, cells.length - 1)] ?? ""
    ).trim();
    if (!standCode && !name) continue;
    const catRaw =
      catIdx >= 0 && cells[catIdx] ? cells[catIdx]!.trim() : "";
    out.push({
      standCode: standCode || name,
      name: name || standCode,
      category: catRaw ? normalizeCategory(catRaw) : null,
    });
    if (out.length >= 500) break;
  }
  return out;
}

function buildSystemPrompt() {
  return [
    "You are Con·cierge, Bizcon’s venue mapping assistant.",
    "You analyse venue floor-plan images for indoor event navigation.",
    "Return JSON only: { \"locations\": [ ... ] }.",
    "Each location: name (string), category (one of the allowed values), x (0-1 left→right), y (0-1 top→bottom), stand_code (optional), confidence (0-1 optional).",
    `Allowed categories: ${MAP_POI_CATEGORIES.join(", ")}.`,
    "Detect labeled stands/booths, toilets, coffee/café, food, entrances, exits, registration, stages, meeting/session rooms, lifts, stairs, information, first aid, and similar facilities.",
    "Use the printed stand number as stand_code when visible; prefer company name from a provided stand list when codes match.",
    "Coordinates are normalized relative to the full image (0,0 = top-left; 1,1 = bottom-right). Place pins inside rooms/stands, not in corridors when the label is clearly for a room.",
    "Do not invent dense grids of unlabeled empty booths. Prefer visible labels and clear facilities.",
    "If many stands are visible, include as many labeled ones as you can (up to 300).",
  ].join(" ");
}

export async function detectLocationsFromFloorImage(input: {
  imageUrl: string;
  standList?: { standCode: string; name: string; category: MapPoiCategory | null }[];
}): Promise<{ proposals: DetectedPoiProposal[]; model: string }> {
  const client = openaiClient();
  const model = openaiVenueModel();

  const userTextParts = [
    "Detect all useful navigation locations on this floor plan.",
    "Return JSON with a locations array.",
  ];
  if (input.standList && input.standList.length > 0) {
    userTextParts.push(
      "Match stand_code values to this exhibitor list when possible:",
      JSON.stringify(
        input.standList.slice(0, 400).map((s) => ({
          stand_code: s.standCode,
          name: s.name,
          category: s.category,
        })),
      ),
    );
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: [
          { type: "text", text: userTextParts.join("\n") },
          {
            type: "image_url",
            image_url: { url: input.imageUrl, detail: "high" },
          },
        ],
      },
    ],
    max_tokens: 8000,
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No response from AI detection.");
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }

  const parsed = detectionResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("AI returned an unexpected detection shape.");
  }

  const standByCode = new Map(
    (input.standList ?? []).map((s) => [s.standCode.toLowerCase(), s]),
  );

  const proposals: DetectedPoiProposal[] = [];
  const seen = new Set<string>();

  for (const row of parsed.data.locations) {
    const standCode = row.stand_code?.trim() || null;
    const match = standCode
      ? standByCode.get(standCode.toLowerCase())
      : undefined;
    const category = match?.category ?? normalizeCategory(row.category);
    const name = (match?.name || row.name).trim();
    if (!name) continue;

    const x = clamp01(row.x);
    const y = clamp01(row.y);
    const key = `${name.toLowerCase()}|${x.toFixed(3)}|${y.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    proposals.push({
      name: name.slice(0, 120),
      category,
      x,
      y,
      standCode,
      confidence:
        typeof row.confidence === "number" ? clamp01(row.confidence) : null,
    });
  }

  return { proposals, model };
}
