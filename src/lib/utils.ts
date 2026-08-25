import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Relative in-app path only (open-redirect safe). Used after Clerk sign-up/in.
 */
export function safeAppRedirectPath(
  value: unknown,
  fallback = "/home",
): string {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  return path;
}

/** Sign-up URL that returns attendees to the delegate portal after Clerk. */
export function attendeeSignUpUrl(email: string, redirectPath = "/me") {
  const params = new URLSearchParams({
    email_address: email.trim().toLowerCase(),
    redirect_url: safeAppRedirectPath(redirectPath, "/me"),
  });
  return `${getAppUrl()}/sign-up?${params.toString()}`;
}

export function displayName(
  person: { firstName?: string | null; lastName?: string | null },
) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || "Unknown";
}

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function humanizeEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function hasClerk() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY &&
      !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("xxxxxxxx"),
  );
}

export function turnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
}

export function formatEventWindow(
  startsAt: Date | null,
  endsAt: Date | null,
  timezone: string,
) {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    }).format(d);
  if (startsAt && endsAt) return `${fmt(startsAt)} – ${fmt(endsAt)}`;
  if (startsAt) return fmt(startsAt);
  return "Dates TBC";
}
