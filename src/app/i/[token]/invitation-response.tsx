"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { respondToInvitation } from "@/modules/invitations/actions";
import { Button } from "@/components/ui/button";

export function InvitationResponse({
  token,
  accepted,
  registered,
}: {
  token: string;
  accepted: boolean;
  registered: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [didAccept, setDidAccept] = useState(accepted);
  const [didDecline, setDidDecline] = useState(false);

  if (didDecline) {
    return (
      <div>
        <p className="text-stone-700">
          You have declined this invitation. The organiser has been updated.
        </p>
        <p className="mt-3 text-sm text-stone-500">
          Declining is not the same as cancelling a registration — none was
          created.
        </p>
      </div>
    );
  }

  if (didAccept) {
    return (
      <div>
        <p className="text-stone-700">
          {registered
            ? "You have accepted and completed registration."
            : "You have accepted. Registration is a separate step — complete it to receive your check-in code."}
        </p>
        <Link
          href={`/i/${encodeURIComponent(token)}/register`}
          className="mt-5 inline-flex rounded-sm bg-ink-600 px-5 py-2.5 text-sm font-medium text-white"
        >
          {registered ? "View registration and QR" : "Continue to registration"}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-stone-700">
        Accepting confirms your invitation. You still need to register
        afterwards.
      </p>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              try {
                await respondToInvitation(token, "accept");
                setDidAccept(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not accept");
              }
            });
          }}
        >
          {pending ? "Saving…" : "Accept invitation"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              try {
                await respondToInvitation(token, "decline");
                setDidDecline(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not decline");
              }
            });
          }}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
