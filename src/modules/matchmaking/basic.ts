import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/authz/require";
import { AuthzError } from "@/lib/db/tenant";

export type DirectoryPerson = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  jobTitle: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  about: string | null;
  lookingFor: string | null;
  offering: string | null;
  interests: string[];
  sharedInterests: string[];
  score: number;
};

function asStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function interestKey(value: string) {
  return value.trim().toLowerCase();
}

export async function rankedDirectory(eventId: string): Promise<{
  meId: string;
  people: DirectoryPerson[];
}> {
  const user = await requireUser();
  const me = await prisma.attendee.findFirst({
    where: { eventId, userId: user.id },
    include: { profile: true, privacy: true },
  });
  if (!me) throw new AuthzError("You are not registered for this event", 403);

  const others = await prisma.attendee.findMany({
    where: {
      eventId,
      organisationId: me.organisationId,
      id: { not: me.id },
      OR: [{ privacy: { is: null } }, { privacy: { profileVisible: true } }],
    },
    include: { profile: true, privacy: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const myInterests = asStringArray(me.profile?.interests).map(interestKey);
  const people = others.map((row) => {
    const interests = asStringArray(row.profile?.interests);
    const sharedInterests = interests.filter((item) =>
      myInterests.includes(interestKey(item)),
    );
    let score = sharedInterests.length * 10;
    if (
      me.country &&
      row.country &&
      me.country.trim().toLowerCase() === row.country.trim().toLowerCase()
    ) {
      score += 5;
    }
    if (me.privacy?.matchmakingEnabled && row.privacy?.matchmakingEnabled) {
      score += 2;
    }
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      company: row.company,
      jobTitle: row.jobTitle,
      country: row.country,
      email: row.privacy?.showEmail ? row.email : null,
      phone: row.privacy?.showPhone ? row.phone : null,
      about: row.profile?.about ?? null,
      lookingFor: row.profile?.lookingFor ?? null,
      offering: row.profile?.offering ?? null,
      interests,
      sharedInterests,
      score,
    };
  });

  people.sort((a, b) => b.score - a.score || a.lastName.localeCompare(b.lastName));

  if (people.length > 0) {
    await prisma.$transaction(
      people.map((person) =>
        prisma.matchScore.upsert({
          where: {
            subjectId_candidateId: {
              subjectId: me.id,
              candidateId: person.id,
            },
          },
          create: {
            organisationId: me.organisationId,
            eventId,
            subjectId: me.id,
            candidateId: person.id,
            score: person.score,
            reasons: {
              sharedInterests: person.sharedInterests,
              sameCountry: Boolean(
                me.country &&
                  person.country &&
                  me.country.trim().toLowerCase() ===
                    person.country.trim().toLowerCase(),
              ),
            },
          },
          update: {
            score: person.score,
            reasons: {
              sharedInterests: person.sharedInterests,
              sameCountry: Boolean(
                me.country &&
                  person.country &&
                  me.country.trim().toLowerCase() ===
                    person.country.trim().toLowerCase(),
              ),
            },
          },
        }),
      ),
    );
  }

  return { meId: me.id, people };
}
