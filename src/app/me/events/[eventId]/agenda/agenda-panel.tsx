"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleMySession } from "@/modules/sessions/actions";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type SessionRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  when: string;
  picked: boolean;
};

export function AttendeeAgendaPanel({
  eventId,
  sessions,
}: {
  eventId: string;
  sessions: SessionRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      {sessions.length === 0 ? (
        <p className="text-sm text-stone-700">No sessions have been published.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Session</Th>
              <Th>When</Th>
              <Th>Location</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((row) => (
              <tr key={row.id}>
                <Td>
                  <p className="font-medium text-ink-800">{row.title}</p>
                  {row.description ? (
                    <p className="text-xs text-stone-500">{row.description}</p>
                  ) : null}
                  {row.picked ? (
                    <Badge className="mt-2" tone="success">
                      On my agenda
                    </Badge>
                  ) : null}
                </Td>
                <Td>{row.when || "TBC"}</Td>
                <Td>{row.location || "—"}</Td>
                <Td>
                  <Button
                    type="button"
                    size="sm"
                    variant={row.picked ? "secondary" : "primary"}
                    disabled={pending && pendingId === row.id}
                    onClick={() => {
                      const formData = new FormData();
                      formData.set("sessionId", row.id);
                      setError(null);
                      setPendingId(row.id);
                      start(async () => {
                        try {
                          await toggleMySession(eventId, formData);
                          router.refresh();
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Could not update agenda",
                          );
                        } finally {
                          setPendingId(null);
                        }
                      });
                    }}
                  >
                    {row.picked ? "Remove" : "Add"}
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
