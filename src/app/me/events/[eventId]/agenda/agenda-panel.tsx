"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toggleMySession } from "@/modules/sessions/actions";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type SessionRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  format: "PHYSICAL" | "ONLINE" | "HYBRID";
  when: string;
  picked: boolean;
  teamsJoinUrl: string | null;
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
                  {row.format !== "PHYSICAL" ? (
                    <p className="mt-1 text-xs font-medium text-stone-600">
                      {row.format === "HYBRID" ? "Hybrid" : "Online"}
                      {row.teamsJoinUrl ? " · Microsoft Teams" : ""}
                    </p>
                  ) : null}
                  {row.picked ? (
                    <Badge className="mt-2" tone="success">
                      On my agenda
                    </Badge>
                  ) : null}
                </Td>
                <Td>{row.when || "TBC"}</Td>
                <Td>{row.location || (row.format === "ONLINE" ? "Online" : "—")}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.teamsJoinUrl ? (
                      <a
                        href={row.teamsJoinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-ink-700 px-3 text-[0.8125rem] font-semibold text-white hover:bg-ink-800"
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                        Join session
                      </a>
                    ) : null}
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
                  </div>
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
