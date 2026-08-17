import { describe, expect, it } from "vitest";
import { AuthzError, assertOwned, forOrganisation } from "./tenant";

describe("tenant isolation", () => {
  it("forces organisation A query shape even if another organisationId is supplied", () => {
    const orgA = "org_a";
    const orgB = "org_b";
    const where = forOrganisation(orgA, {
      organisationId: orgB,
      slug: "africa-mining-summit",
    });

    expect(where).toEqual({
      organisationId: orgA,
      slug: "africa-mining-summit",
    });
    expect(where.organisationId).not.toBe(orgB);
  });

  it("assertOwned rejects rows that belong to another organisation", () => {
    const orgA = "org_a";
    const foreign = { id: "evt_1", organisationId: "org_b" };

    expect(() => assertOwned(foreign, orgA)).toThrow(AuthzError);
    expect(() => assertOwned(null, orgA)).toThrow(AuthzError);
    expect(() => assertOwned(undefined, orgA)).toThrow(AuthzError);

    const owned = { id: "evt_1", organisationId: orgA };
    expect(assertOwned(owned, orgA)).toBe(owned);
  });
});
