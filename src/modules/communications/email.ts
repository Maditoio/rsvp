import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";

export async function sendInvitationEmail(input: {
  organisationId: string;
  eventId: string;
  invitationId: string;
  toEmail: string;
  toName: string;
  eventName: string;
  acceptUrl: string;
  orgName: string;
}) {
  const subject = `You're invited to ${input.eventName}`;
  const html = `
    <div style="font-family:Georgia,serif;background:#C6DFB2;padding:32px">
      <div style="max-width:560px;margin:auto;background:#3E3768;color:#ffffff;border-radius:20px;padding:32px">
        <p style="letter-spacing:0.16em;text-transform:uppercase;font-size:12px;color:#E9D9F7">Invitation</p>
        <h1 style="font-size:28px;margin:8px 0 16px">You have been invited to ${escapeHtml(input.eventName)}</h1>
        <p style="color:#D9D4EA">Hello ${escapeHtml(input.toName)}, ${escapeHtml(input.orgName)} would like you to attend.</p>
        <p style="margin:28px 0">
          <a href="${input.acceptUrl}" style="display:inline-block;background:#C6DFB2;color:#141224;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">
            View invitation
          </a>
        </p>
        <p style="font-size:12px;color:#B3AAD5">This link is unique to you. Do not forward it.</p>
      </div>
    </div>
  `;

  const message = await prisma.emailMessage.create({
    data: {
      organisationId: input.organisationId,
      eventId: input.eventId,
      invitationId: input.invitationId,
      toEmail: input.toEmail,
      subject,
      status: "QUEUED",
    },
  });

  if (!process.env.RESEND_API_KEY) {
    console.info("[email:dev]", { to: input.toEmail, subject, acceptUrl: "[redacted]" });
    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    return { id: message.id, simulated: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "Delegate <noreply@example.com>";
  const result = await resend.emails.send({
    from,
    to: input.toEmail,
    subject,
    html,
  });

  await prisma.emailMessage.update({
    where: { id: message.id },
    data: {
      status: result.error ? "FAILED" : "SENT",
      sentAt: result.error ? null : new Date(),
      providerId: result.data?.id,
    },
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
  return { id: message.id, simulated: false };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
