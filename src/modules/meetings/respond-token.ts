import { prisma } from "@/lib/db/prisma";
import { hashToken, tokensMatch } from "@/lib/crypto/tokens";
import {
  peerDisplayName,
  redactAttendeeForViewer,
} from "@/modules/privacy";

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
          privacy: {
            select: {
              profileVisible: true,
              showEmail: true,
              showPhone: true,
              visibility: true,
            },
          },
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

  const redactedRequester = redactAttendeeForViewer(
    {
      firstName: request.requester.firstName,
      lastName: request.requester.lastName,
      company: request.requester.company,
      jobTitle: request.requester.jobTitle,
      country: null,
      email: "",
      phone: null,
    },
    request.requester.privacy,
    "peer",
    { requireListed: false },
  )!;

  return {
    ...request,
    requester: {
      id: request.requester.id,
      userId: request.requester.userId,
      firstName: redactedRequester.firstName,
      lastName: redactedRequester.lastName,
      company: redactedRequester.company,
      jobTitle: redactedRequester.jobTitle,
      displayName: peerDisplayName(redactedRequester),
    },
  };
}
