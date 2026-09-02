import { z } from "zod";
import { Prisma } from "@prisma/client";
import { AuthzError } from "@/lib/db/tenant";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function actionOk<T = void>(data?: T): ActionResult<T> {
  return { ok: true, data: data as T };
}

export function actionFail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export function publicActionError(error: unknown, fallback: string): string {
  if (error instanceof AuthzError) throw error;

  if (error instanceof z.ZodError) {
    const message = error.issues[0]?.message?.trim();
    if (message) return message;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return "Database schema is out of date. Run migrations on production.";
    }
    const tableMissing = error.message.match(/The table `[^`]+` does not exist/);
    if (tableMissing) {
      return `${tableMissing[0]}. Run database migrations.`;
    }
  }

  if (error instanceof Error && error.message && error.message.length < 220) {
    const message = error.message.trim();
    if (
      message &&
      !message.startsWith("An error occurred in the Server Components") &&
      !message.includes("digest")
    ) {
      return message;
    }
  }
  return fallback;
}

export async function runAction<T>(
  fn: () => Promise<T>,
  fallback: string,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return actionOk(data);
  } catch (error) {
    return actionFail(publicActionError(error, fallback));
  }
}
