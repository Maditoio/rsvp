import { Prisma } from "@prisma/client";

const TRANSIENT_CODES = new Set(["P1001", "P1017", "P2024"]);

function isTransientDbError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_CODES.has(error.code);
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /can't reach database server|timed out fetching a new connection|connection pool/i.test(
    message,
  );
}

/**
 * Neon computes scale to zero; the first connect after idle can exceed Prisma's
 * default timeout. Retry a couple of times so cold starts don't fail navigation.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 750;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayMs * attempt),
      );
    }
  }

  throw lastError;
}
