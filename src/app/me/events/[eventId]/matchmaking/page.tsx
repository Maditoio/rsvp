import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { loadMyMatchmaking } from "@/modules/matchmaking/actions";
import { QuestionnaireWizard } from "./questionnaire-wizard";

export default async function MatchmakingQuestionnairePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  await safe(() => requireUser());
  const data = await safe(() => loadMyMatchmaking(eventId));

  return (
    <div>
      <QuestionnaireWizard
        eventId={eventId}
        eventName={data.eventName}
        initialQuestionnaire={data.questionnaire}
        alreadyComplete={data.complete}
        initialPrivacy={data.privacy}
      />
    </div>
  );
}
