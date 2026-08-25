import { SignUp } from "@clerk/nextjs";
import { hasClerk, safeAppRedirectPath } from "@/lib/utils";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectUrl = safeAppRedirectPath(
    typeof params.redirect_url === "string" ? params.redirect_url : undefined,
    "/home",
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      {hasClerk() ? (
        <SignUp
          fallbackRedirectUrl={redirectUrl}
          forceRedirectUrl={redirectUrl}
          signInUrl="/sign-in"
        />
      ) : (
        <div className="max-w-md rounded-xl bg-white p-8 text-slate-900 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            Clerk is not configured
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Configure Clerk keys before creating an account.
          </p>
        </div>
      )}
    </div>
  );
}
