import { PageLoadingState } from "@/components/ui/loading-state";

export default function Loading() {
  return (
    <div className="flex-1 p-6 md:p-10">
      <PageLoadingState
        title="Loading organisation"
        detail="Bringing together dashboard and member data..."
      />
    </div>
  );
}
