"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestMeeting } from "@/modules/meetings/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { displayName } from "@/lib/utils";

type DirectoryPerson = {
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

export function DirectoryPanel({
  eventId,
  people,
}: {
  eventId: string;
  people: DirectoryPerson[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<DirectoryPerson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {people.length === 0 ? (
        <p className="text-sm text-stone-700">
          No other visible profiles yet. Ask attendees to complete their profile
          and leave directory visibility on.
        </p>
      ) : (
        people.map((person) => (
          <Card key={person.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium text-ink-800">{displayName(person)}</p>
                <p className="text-sm text-stone-700">
                  {[person.jobTitle, person.company, person.country]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                {person.about ? (
                  <p className="mt-2 text-sm text-stone-700">{person.about}</p>
                ) : null}
                {person.lookingFor ? (
                  <p className="mt-2 text-xs text-stone-500">
                    Looking for {person.lookingFor}
                  </p>
                ) : null}
                {person.offering ? (
                  <p className="text-xs text-stone-500">Offering {person.offering}</p>
                ) : null}
                {person.email ? (
                  <p className="mt-2 text-xs text-stone-500">{person.email}</p>
                ) : null}
                {person.phone ? (
                  <p className="text-xs text-stone-500">{person.phone}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {person.sharedInterests.map((interest) => (
                    <Badge key={interest} tone="accent">
                      {interest}
                    </Badge>
                  ))}
                  {person.interests
                    .filter((interest) => !person.sharedInterests.includes(interest))
                    .map((interest) => (
                      <Badge key={interest} tone="muted">
                        {interest}
                      </Badge>
                    ))}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setTarget(person);
                  setError(null);
                  setOpen(true);
                }}
              >
                Request meeting
              </Button>
            </div>
          </Card>
        ))
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Request a meeting"
        description={
          target
            ? `Send a request to ${displayName(target)}. They must accept before a meeting is created.`
            : undefined
        }
      >
        {target ? (
          <form
            className="space-y-4"
            action={(formData) => {
              setError(null);
              start(async () => {
                try {
                  await requestMeeting(eventId, formData);
                  setOpen(false);
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not send request",
                  );
                }
              });
            }}
          >
            <input type="hidden" name="targetId" value={target.id} />
            <div>
              <Label htmlFor="message">Note (optional)</Label>
              <Textarea id="message" name="message" />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex justify-end">
              <Button disabled={pending}>
                {pending ? "Sending…" : "Send request"}
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>
    </div>
  );
}
