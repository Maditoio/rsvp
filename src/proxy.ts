import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAppUrl } from "@/lib/utils";

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

function passthrough(..._args: [NextRequest, NextFetchEvent]) {
  return NextResponse.next();
}

const authHandler = clerkKeysAreValid()
  ? clerkMiddleware(async (auth, request) => {
      if (isProtected(request)) {
        await auth.protect();
      }
    })
  : passthrough;

/** Is this host our own app (main domain, localhost, or a Vercel preview URL)? Cheap, no DB. */
function isPlatformHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") return true;
  if (host.endsWith(".vercel.app")) return true;
  try {
    if (host === new URL(getAppUrl()).hostname.toLowerCase()) return true;
  } catch {
    // ignore — getAppUrl() is expected to be a valid URL
  }
  return false;
}

/**
 * Requests arriving on a verified custom domain are rewritten to the event's public
 * site route. The event website is a single page, so only the root path is rewritten;
 * everything else (e.g. /a/{org}/{event} apply links) already resolves on any host.
 */
async function resolveCustomDomainRewrite(request: NextRequest): Promise<NextResponse | null> {
  // `nextUrl.hostname` reflects the server's own bind address, not the visitor's domain —
  // the actual requested host (what a custom domain visitor typed) lives in these headers.
  const hostname = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.hostname
  )
    .split(":")[0]
    .toLowerCase();
  if (isPlatformHost(hostname) || request.nextUrl.pathname !== "/") return null;

  try {
    const settings = await prisma.eventSettings.findFirst({
      where: {
        customDomain: hostname,
        customDomainStatus: "verified",
        websitePublishedAt: { not: null },
      },
      select: {
        event: { select: { slug: true, organisation: { select: { slug: true } } } },
      },
    });
    if (!settings?.event) return null;

    const url = request.nextUrl.clone();
    url.pathname = `/e/${settings.event.organisation.slug}/${settings.event.slug}`;
    return NextResponse.rewrite(url);
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const domainRewrite = await resolveCustomDomainRewrite(request);
  if (domainRewrite) return domainRewrite;

  return authHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
