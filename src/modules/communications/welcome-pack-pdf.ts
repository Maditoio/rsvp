import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export type WelcomePackInput = {
  eventName: string;
  orgName: string;
  attendeeName: string;
  company: string | null;
  categoryName: string | null;
  venue: string | null;
  timezone: string;
  startsAt: Date | null;
  endsAt: Date | null;
  /** Opaque desk check-in token only — never names or emails. */
  attendanceToken: string;
};

function formatWhen(
  startsAt: Date | null,
  endsAt: Date | null,
  timezone: string,
) {
  if (!startsAt) return "Dates to be confirmed";
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone || "UTC",
  };
  const start = startsAt.toLocaleString("en-GB", opts);
  if (!endsAt) return start;
  const end = endsAt.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone || "UTC",
  });
  return `${start} – ${end}`;
}

function safeFilenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "event";
}

/**
 * A4 welcome sheet for guests without a phone: event details + desk check-in QR.
 * Uses the attendee attendance token (not the printed badge credential).
 */
export async function buildWelcomePackPdf(
  input: WelcomePackInput,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const qrPng = await QRCode.toBuffer(input.attendanceToken, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320,
    color: { dark: "#0F172A", light: "#FFFFFF" },
  });

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const qrImage = await doc.embedPng(qrPng);

  const slate900 = rgb(0.06, 0.09, 0.16);
  const slate600 = rgb(0.28, 0.33, 0.41);
  const slate400 = rgb(0.58, 0.64, 0.72);
  const indigo = rgb(0.31, 0.27, 0.9);

  const margin = 48;
  let y = 792;

  page.drawText("BIZCON RSVP", {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: indigo,
  });
  y -= 18;
  page.drawText("Welcome & check-in", {
    x: margin,
    y,
    size: 11,
    font,
    color: slate400,
  });
  y -= 36;

  page.drawText(input.eventName.slice(0, 70), {
    x: margin,
    y,
    size: 22,
    font: fontBold,
    color: slate900,
  });
  y -= 22;
  page.drawText(input.orgName.slice(0, 80), {
    x: margin,
    y,
    size: 12,
    font,
    color: slate600,
  });
  y -= 36;

  const when = formatWhen(input.startsAt, input.endsAt, input.timezone);
  page.drawText("When", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: slate400,
  });
  y -= 14;
  page.drawText(when.slice(0, 90), {
    x: margin,
    y,
    size: 12,
    font,
    color: slate900,
  });
  y -= 24;

  if (input.venue) {
    page.drawText("Where", {
      x: margin,
      y,
      size: 9,
      font: fontBold,
      color: slate400,
    });
    y -= 14;
    page.drawText(input.venue.slice(0, 90), {
      x: margin,
      y,
      size: 12,
      font,
      color: slate900,
    });
    y -= 24;
  }

  page.drawText("Delegate", {
    x: margin,
    y,
    size: 9,
    font: fontBold,
    color: slate400,
  });
  y -= 14;
  page.drawText(input.attendeeName.slice(0, 80), {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: slate900,
  });
  y -= 16;
  const meta = [input.company, input.categoryName].filter(Boolean).join(" · ");
  if (meta) {
    page.drawText(meta.slice(0, 90), {
      x: margin,
      y,
      size: 11,
      font,
      color: slate600,
    });
    y -= 28;
  } else {
    y -= 12;
  }

  y -= 8;
  page.drawText("Bring this page to registration", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: slate900,
  });
  y -= 16;
  page.drawText(
    "Staff will scan the QR code below to check you in. Keep this printout private.",
    {
      x: margin,
      y,
      size: 10,
      font,
      color: slate600,
    },
  );
  y -= 28;

  const qrSize = 200;
  const qrX = (595.28 - qrSize) / 2;
  page.drawRectangle({
    x: qrX - 12,
    y: y - qrSize - 12,
    width: qrSize + 24,
    height: qrSize + 24,
    borderColor: rgb(0.89, 0.91, 0.94),
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  page.drawImage(qrImage, {
    x: qrX,
    y: y - qrSize,
    width: qrSize,
    height: qrSize,
  });
  y -= qrSize + 36;

  page.drawText(
    "No phone? This A4 sheet is your check-in pass. Do not share or photocopy for others.",
    {
      x: margin,
      y,
      size: 9,
      font,
      color: slate400,
      maxWidth: 595.28 - margin * 2,
    },
  );

  page.drawText("Powered by Bizcon RSVP", {
    x: margin,
    y: 36,
    size: 8,
    font,
    color: slate400,
  });

  const bytes = await doc.save();
  const filename = `${safeFilenamePart(input.eventName)}-welcome-check-in.pdf`;
  return { bytes, filename };
}
