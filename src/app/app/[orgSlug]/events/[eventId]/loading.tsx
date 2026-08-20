import { PageLoadingState } from "@/components/ui/loading-state";

export default function Loading() {
  return (
    <PageLoadingState
      title="Loading event"
      detail="Gathering registrations, invitations, and event analytics..."
    />
  );
}
