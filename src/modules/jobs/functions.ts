import { inngest } from "@/modules/jobs/client";
import { sendInvitationEmail } from "@/modules/communications/email";

type InvitationSendEvent = {
  name: "invitation/send";
  data: {
    organisationId: string;
    eventId: string;
    invitationId: string;
    toEmail: string;
    toName: string;
    eventName: string;
    acceptUrl: string;
    orgName: string;
  };
};

export const sendInvitationJob = inngest.createFunction(
  {
    id: "invitation-send",
    retries: 4,
    triggers: [{ event: "invitation/send" }],
  },
  async ({ event }: { event: InvitationSendEvent }) => {
    await sendInvitationEmail(event.data);
    return { ok: true };
  },
);

export const functions = [sendInvitationJob];
