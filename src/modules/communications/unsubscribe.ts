"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { actionFail, actionOk, publicActionError, type ActionResult } from "@/lib/action-result";

const PLATFORM_EMAIL_PURPOSE = "platform_emails";

export async function unsubscribePlatformEmails(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const email = z
      .string()
      .email()
      .parse(String(formData.get("email") ?? "").trim().toLowerCase());

    const limited = await rateLimit(`unsubscribe:${email}`, 10, 60);
    if (!limited.success) {
      return actionFail("Too many attempts. Please wait a minute and try again.");
    }

    // Prefer an organisation the email is already linked to; otherwise create a
    // platform-scoped consent row against the first org that emailed them, or skip org.
    const priorMessage = await prisma.emailMessage.findFirst({
      where: { toEmail: email },
      orderBy: { createdAt: "desc" },
      select: { organisationId: true, eventId: true },
    });

    if (!priorMessage) {
      // Still acknowledge — no prior mail on file.
      return actionOk();
    }

    await prisma.consent.create({
      data: {
        organisationId: priorMessage.organisationId,
        eventId: priorMessage.eventId,
        email,
        purpose: PLATFORM_EMAIL_PURPOSE,
        granted: false,
      },
    });

    return actionOk();
  } catch (error) {
    return actionFail(publicActionError(error, "Could not unsubscribe."));
  }
}
