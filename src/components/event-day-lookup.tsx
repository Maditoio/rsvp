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
import { useToast } from "@/components/ui/toast";

export function EventDayLookup({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<CheckInSearchRow[]>([]);
  const [selected, setSelected] = useState<CheckInSearchRow | null>(null);
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function showError(message: string) {
    setError(message);
    toast.error(message);
  }

  function runSearch() {
    const term = query.trim();
    if (term.length < 2) {
      showError("Enter at least two characters.");
      return;
    }
    setError(null);
    setSelected(null);
    setOutcome(null);
    start(async () => {
      const result = await searchCheckInAttendees(orgSlug, eventId, term);
      if (!result.ok) {
        setRows([]);
        showError(result.error);
        return;
      }
      setRows(result.data);
      if (result.data.length === 0) {
        showError("No matching delegates found.");
      }
    });
  }

  function checkIn(row: CheckInSearchRow) {
    setError(null);
    start(async () => {
      const result = await performCheckInByAttendeeId(
        orgSlug,
        eventId,
        row.attendeeId,
      );
      if (!result.ok) {
        showError(result.error);
        return;
      }
      setSelected({
        ...row,
        alreadyCheckedIn: result.data.view.alreadyCheckedIn,
        checkedInAt: result.data.view.checkedInAt,
      });
      setOutcome(result.data.outcome);
      setRows((current) =>
        current.map((item) =>
          item.attendeeId === row.attendeeId
            ? {
                ...item,
                alreadyCheckedIn: result.data.view.alreadyCheckedIn,
                checkedInAt: result.data.view.checkedInAt,
              }
            : item,
        ),
      );
      if (result.data.outcome === "checked_in") {
        toast.success(`${row.name} checked in.`);
      } else {
        toast.error(`${row.name} is already checked in.`);
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
        {error ? (
          <p className="mt-3 rounded-sm border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
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
