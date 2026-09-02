export type AuthzErrorCode = "ORG_SUSPENDED" | "EVENT_SUSPENDED";

export class AuthzError extends Error {
  status: number;
  code?: AuthzErrorCode;

  constructor(message: string, status = 403, code?: AuthzErrorCode) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
    this.code = code;
  }
}

/** Always pins `organisationId` so a tenant query cannot silently target another org. */
export function forOrganisation<T extends Record<string, unknown> = Record<string, never>>(
  organisationId: string,
  extra?: T,
): T & { organisationId: string } {
  if (!organisationId) {
    throw new AuthzError("organisationId is required for tenant queries", 400);
  }
  return { ...(extra as T), organisationId };
}

export function assertOwned<T extends { organisationId: string }>(
  row: T | null | undefined,
  organisationId: string,
  notFoundMessage = "Not found",
): T {
  if (!row || row.organisationId !== organisationId) {
    throw new AuthzError(notFoundMessage, 404);
  }
  return row;
}
