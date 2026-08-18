import { PageLoadingState } from "@/components/ui/loading-state";

export default function Loading() {
  return <PageLoadingState title="Loading platform" detail="Collecting tenant and access overview data..." />;
}
