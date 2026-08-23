import { SignUp } from "@clerk/nextjs";
import { hasClerk } from "@/lib/utils";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      {hasClerk() ? (
        <SignUp />
      ) : (
        <div className="max-w-md rounded-xl bg-white p-8 text-slate-900 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            Clerk is not configured
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Configure Clerk keys before creating an organiser account.
          </p>
        </div>
      )}
    </div>
  );
}
