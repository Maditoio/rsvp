import { PageLoadingState } from "@/components/ui/loading-state";

export default function Loading() {
  return <PageLoadingState title="Loading workspace" detail="Fetching your organisation and event data..." />;
}
