import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireEvent } from "@/lib/authz/require";
import { TEMPLATE_HEADERS } from "@/modules/contacts/parse";

export async function GET(
  _request: Request,
  context: RouteContext<"/app/[orgSlug]/events/[eventId]/invitees/import/template">,
) {
  const { orgSlug, eventId } = await context.params;
  await requireEvent(orgSlug, eventId, "invitees.write");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Invitees");
  sheet.addRow(TEMPLATE_HEADERS);
  sheet.addRow([
    "Ada",
    "Lovelace",
    "ada@example.com",
    "+27 11 000 0000",
    "Analytical Engines",
    "Mathematician",
    "United Kingdom",
    "Delegate",
    "",
    "",
    "",
    "",
  ]);
  sheet.getRow(1).font = { bold: true };

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="bizcon-invitees-template.xlsx"',
    },
  });
}
