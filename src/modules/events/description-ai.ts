import OpenAI from "openai";

const MAX_DESCRIPTION_CHARS = 4000;
const MIN_NOTES_CHARS = 8;

function openaiClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function openaiModel() {
  return process.env.OPENAI_MATCH_MODEL?.trim() || "gpt-4o-mini";
}

export type EventDescriptionContext = {
  name: string;
  venue?: string | null;
  timezone?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  website?: string | null;
};

function stripMarkdown(value: string) {
  return value
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function clampDescription(value: string) {
  return stripMarkdown(value).slice(0, MAX_DESCRIPTION_CHARS).trim();
}

/** Deterministic polish when OpenAI is unavailable — keeps the feature usable. */
export function fallbackGenerateDescription(
  notes: string,
  ctx: EventDescriptionContext,
): string {
  const cleaned = notes.replace(/\s+/g, " ").trim();
  const venue = ctx.venue?.trim();
  const when = [ctx.startsAt, ctx.endsAt].filter(Boolean).join(" – ");

  const parts = [
    `${ctx.name} brings professionals together for focused conversation and collaboration.`,
    cleaned,
  ];
  if (when) parts.push(`The programme runs ${when}.`);
  if (venue) parts.push(`Join us at ${venue}.`);
  parts.push(
    "Attendees can confirm participation, complete registration, and connect through the event app.",
  );

  return clampDescription(parts.join(" "));
}

export function fallbackImproveDescription(
  notes: string,
  ctx: EventDescriptionContext,
): string {
  const cleaned = notes.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return fallbackGenerateDescription(
      `Professional gathering focused on ${ctx.name}.`,
      ctx,
    );
  }
  const prefix = cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
  return clampDescription(
    `${prefix} Organised as ${ctx.name}${ctx.venue?.trim() ? ` at ${ctx.venue.trim()}` : ""}.`,
  );
}

export async function generateEventDescription(input: {
  notes: string;
  context: EventDescriptionContext;
}): Promise<{ description: string; usedAi: boolean; note?: string }> {
  const notes = input.notes.trim();
  if (notes.length < MIN_NOTES_CHARS) {
    throw new Error(
      "Add a short description or a few details before generating.",
    );
  }

  const client = openaiClient();
  if (!client) {
    return {
      description: fallbackGenerateDescription(notes, input.context),
      usedAi: false,
      note: "Using a template draft — set OPENAI_API_KEY for Con·cierge AI generation.",
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: openaiModel(),
      temperature: 0.5,
      max_tokens: 450,
      messages: [
        {
          role: "system",
          content:
            "You write clear, professional event descriptions for summit and conference organisers. " +
            "Turn the organiser's short notes into a polished 2–4 sentence description suitable for invitations, registration pages, and emails. " +
            "Use a confident, welcoming tone. Do not invent sponsors, speakers, prices, or legal claims. " +
            "Do not use markdown, bullet lists, or headings. Return plain text only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            event: {
              name: input.context.name,
              venue: input.context.venue ?? null,
              timezone: input.context.timezone ?? null,
              starts_at: input.context.startsAt ?? null,
              ends_at: input.context.endsAt ?? null,
              website: input.context.website ?? null,
            },
            organiser_notes: notes,
          }),
        },
      ],
    });

    const description = response.choices[0]?.message?.content?.trim();
    if (!description) {
      return {
        description: fallbackGenerateDescription(notes, input.context),
        usedAi: false,
        note: "Con·cierge returned an empty response — applied a template draft.",
      };
    }
    return { description: clampDescription(description), usedAi: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return {
      description: fallbackGenerateDescription(notes, input.context),
      usedAi: false,
      note: `Con·cierge unavailable (${message.slice(0, 120)}) — applied a template draft.`,
    };
  }
}

export async function improveEventDescription(input: {
  notes: string;
  context: EventDescriptionContext;
}): Promise<{ description: string; usedAi: boolean; note?: string }> {
  const notes = input.notes.trim();
  if (notes.length < MIN_NOTES_CHARS) {
    throw new Error("Add a bit more detail before improving the description.");
  }

  const client = openaiClient();
  if (!client) {
    return {
      description: fallbackImproveDescription(notes, input.context),
      usedAi: false,
      note: "Using a template polish — set OPENAI_API_KEY for Con·cierge AI.",
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: openaiModel(),
      temperature: 0.4,
      max_tokens: 450,
      messages: [
        {
          role: "system",
          content:
            "You refine event descriptions for professional summits. " +
            "Rewrite the text into a clearer 2–4 sentence description. Keep the organiser's intent. " +
            "Do not invent facts. No markdown. Return plain text only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            event_name: input.context.name,
            venue: input.context.venue ?? null,
            current_description: notes,
          }),
        },
      ],
    });

    const description = response.choices[0]?.message?.content?.trim();
    if (!description) {
      return {
        description: fallbackImproveDescription(notes, input.context),
        usedAi: false,
        note: "Con·cierge returned an empty response — applied a template polish.",
      };
    }
    return { description: clampDescription(description), usedAi: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI improve failed";
    return {
      description: fallbackImproveDescription(notes, input.context),
      usedAi: false,
      note: `Con·cierge unavailable (${message.slice(0, 120)}) — applied a template polish.`,
    };
  }
}
