"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PollEditorDrawer } from "./poll-editor-drawer";

export function NewPollButton({
  orgSlug,
  eventId,
}: {
  orgSlug: string;
  eventId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" leadingIcon="plus" onClick={() => setOpen(true)}>
        New poll
      </Button>
      <PollEditorDrawer
        orgSlug={orgSlug}
        eventId={eventId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
