import { AuthzError } from "@/lib/db/tenant";
import { notFound, redirect } from "next/navigation";

export function fromAuthz(error: unknown): never {
  if (error instanceof AuthzError) {
    if (error.status === 401) redirect("/sign-in");
    if (error.status === 404 || error.status === 403) notFound();
  }
  throw error;
}

export async function safe<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    fromAuthz(error);
  }
}
