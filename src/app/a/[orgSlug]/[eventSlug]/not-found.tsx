import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function PublicApplyNotFound() {
  return (
    <Card>
      <h1 className="font-display text-3xl text-ink-800">
        Applications are not open
      </h1>
      <p className="mt-3 text-stone-700">
        This event is not accepting public applications, or the link is
        incorrect.
      </p>
      <Link href="/" className="mt-5 inline-flex text-sm text-ink-700 underline">
        Back to Delegate
      </Link>
    </Card>
  );
}
