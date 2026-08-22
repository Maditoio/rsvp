import { prisma } from "@/lib/db/prisma";
import { hashToken, tokensMatch } from "@/lib/crypto/tokens";

export async function loadMeetingRequestByToken(rawToken: string) {
  const hash = hashToken(rawToken);
  const request = await prisma.meetingRequest.findFirst({
    where: { responseTokenHash: hash },
    include: {
      event: { select: { id: true, name: true } },
      requester: {
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          company: true,
          jobTitle: true,
        },
      },
      target: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          userId: true,
        },
      },
    },
  });
  if (!request) return null;
  if (!request.responseTokenHash || !tokensMatch(rawToken, request.responseTokenHash)) {
    return null;
  }
  return request;
}
