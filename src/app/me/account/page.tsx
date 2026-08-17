import { UserButton } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { hasClerk } from "@/lib/utils";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";

export default async function AttendeeAccountPage() {
  const user = await safe(() => requireUser());

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-4xl text-slate-900">Account</h1>
      <Card>
        <p className="text-sm text-slate-600">
          Identity is managed by Clerk. Organisation roles and event access live
          in Delegate — signing in does not grant organiser permissions.
        </p>
        <p className="mt-4 text-sm text-slate-500">Signed in as</p>
        <p className="text-slate-900">{user.email}</p>
        <div className="mt-6">
          {hasClerk() ? (
            <UserButton />
          ) : (
            <p className="text-sm text-slate-500">
              Account controls appear here once Clerk is configured.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
