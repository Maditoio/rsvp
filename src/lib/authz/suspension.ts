import { AuthzError } from "@/lib/db/tenant";

export function isSuspensionError(
  error: unknown,
): error is AuthzError & { code: "ORG_SUSPENDED" | "EVENT_SUSPENDED" } {
  return (
    error instanceof AuthzError &&
    (error.code === "ORG_SUSPENDED" || error.code === "EVENT_SUSPENDED")
  );
}

export function suspensionScope(
  error: unknown,
): "organisation" | "event" | null {
  if (!(error instanceof AuthzError)) return null;
  if (error.code === "ORG_SUSPENDED") return "organisation";
  if (error.code === "EVENT_SUSPENDED") return "event";
  return null;
}
