import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProtected = createRouteMatcher(["/app(.*)", "/me(.*)", "/platform(.*)", "/home(.*)"]);

function clerkKeysAreValid() {
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secret = process.env.CLERK_SECRET_KEY ?? "";
  return (
    publishable.startsWith("pk_") &&
    secret.startsWith("sk_") &&
    !publishable.includes("xxxxxxxx") &&
    !secret.includes("xxxxxxxx")
  );
}

function passthrough(_request: NextRequest) {
  return NextResponse.next();
}

export default clerkKeysAreValid()
  ? clerkMiddleware(async (auth, request) => {
      if (isProtected(request)) {
        await auth.protect();
      }
    })
  : passthrough;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
