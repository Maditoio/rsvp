import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function InvitationNotFound() {
  return (
    <Card>
      <h1 className="font-serif text-3xl text-slate-900">
        Invitation not found
      </h1>
      <p className="mt-3 text-slate-600">
        This link is invalid or has been replaced. Ask the organiser to resend
        the invitation.
      </p>
      <Link href="/" className="mt-5 inline-flex text-sm text-primary-700 underline">
        Back to Delegate
      </Link>
    </Card>
  );
}
