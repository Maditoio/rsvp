"use client";

import { useState, useTransition } from "react";
import {
  performCheckInByAttendeeId,
  searchCheckInAttendees,
} from "@/modules/checkin/actions";
import type { CheckInOutcome, CheckInSearchRow } from "@/modules/checkin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function EventDayLookup({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<CheckInSearchRow[]>([]);
  const [selected, setSelected] = useState<CheckInSearchRow | null>(null);
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function runSearch() {
    const term = query.trim();
    if (term.length < 2) {
      setError("Enter at least two characters.");
      return;
    }
    setError(null);
    setSelected(null);
    setOutcome(null);
    start(async () => {
      try {
        const results = await searchCheckInAttendees(orgSlug, eventId, term);
        setRows(results);
        if (results.length === 0) {
          setError("No matching delegates found.");
        }
      } catch (e) {
        setRows([]);
        setError(e instanceof Error ? e.message : "Search failed");
      }
    });
  }

  function checkIn(row: CheckInSearchRow) {
    setError(null);
    start(async () => {
      try {
        const result = await performCheckInByAttendeeId(
          orgSlug,
          eventId,
          row.attendeeId,
        );
        setSelected({
          ...row,
          alreadyCheckedIn: result.view.alreadyCheckedIn,
          checkedInAt: result.view.checkedInAt,
        });
        setOutcome(result.outcome);
        setRows((current) =>
          current.map((item) =>
            item.attendeeId === row.attendeeId
              ? {
                  ...item,
                  alreadyCheckedIn: result.view.alreadyCheckedIn,
                  checkedInAt: result.view.checkedInAt,
                }
              : item,
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Check-in failed");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <Label htmlFor="delegate-search">Search delegates</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="delegate-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or company"
            autoComplete="off"
          />
          <Button type="button" disabled={pending} onClick={runSearch}>
            {pending ? "Searching…" : "Search"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Staff see name, company, category, and check-in status only.
        </p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </Card>

      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.attendeeId}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-ink-800">{row.name}</p>
                  <p className="mt-1 text-sm text-stone-700">
                    {row.company || "Company not listed"}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {row.category || "Uncategorised"}
                  </p>
                  <div className="mt-2">
                    {row.alreadyCheckedIn ? (
                      <Badge tone="warning">Already checked in</Badge>
                    ) : (
                      <Badge tone="muted">Not checked in</Badge>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={row.alreadyCheckedIn ? "secondary" : "primary"}
                  disabled={pending || row.alreadyCheckedIn}
                  onClick={() => checkIn(row)}
                >
                  {row.alreadyCheckedIn ? "Checked in" : "Check in"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {selected && outcome ? (
        <Card>
          {outcome === "checked_in" ? (
            <Badge tone="success">Checked in successfully</Badge>
          ) : (
            <Badge tone="warning">Already checked in</Badge>
          )}
          <p className="mt-3 text-sm text-stone-700">
            {selected.name}
            {selected.checkedInAt
              ? ` · ${new Date(selected.checkedInAt).toLocaleString()}`
              : ""}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
