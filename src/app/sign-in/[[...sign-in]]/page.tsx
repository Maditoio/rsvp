import { SignIn } from "@clerk/nextjs";
import { hasClerk } from "@/lib/utils";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-300 p-6">
      {hasClerk() ? (
        <SignIn />
      ) : (
        <div className="max-w-md rounded-2xl bg-white p-8 text-slate-800">
          <h1 className="font-serif text-2xl">Clerk is not configured</h1>
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
