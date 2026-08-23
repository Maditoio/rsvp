import { SignIn } from "@clerk/nextjs";
import { hasClerk } from "@/lib/utils";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      {hasClerk() ? (
        <SignIn fallbackRedirectUrl="/home" signUpUrl="/sign-up" />
      ) : (
        <div className="max-w-md rounded-xl bg-white p-8 text-slate-900 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            Clerk is not configured
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Add <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
            <code>CLERK_SECRET_KEY</code> to <code>.env.local</code> from{" "}
            <code>.env.example</code>.
          </p>
        </div>
      )}
    </div>
  );
}
