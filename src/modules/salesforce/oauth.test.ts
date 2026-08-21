import { afterEach, describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secret";
import {
  generateSalesforcePkce,
  getSalesforceAuthUrl,
  getSalesforceLoginUrl,
  getSalesforceRedirectUri,
  parseSalesforceOrgIdFromIdentityUrl,
  SALESFORCE_SCOPES,
} from "./oauth";
import { mapSalesforceContact } from "./contacts";

describe("SALESFORCE_SCOPES", () => {
  it("includes api, refresh_token, and offline_access", () => {
    expect([...SALESFORCE_SCOPES]).toEqual([
      "api",
      "refresh_token",
      "offline_access",
    ]);
  });
});

describe("getSalesforceLoginUrl", () => {
  const prev = process.env.SALESFORCE_LOGIN_URL;

  afterEach(() => {
    if (prev === undefined) delete process.env.SALESFORCE_LOGIN_URL;
    else process.env.SALESFORCE_LOGIN_URL = prev;
  });

  it("defaults to https://login.salesforce.com", () => {
    delete process.env.SALESFORCE_LOGIN_URL;
    expect(getSalesforceLoginUrl()).toBe("https://login.salesforce.com");
  });

  it("prepends https:// when the scheme is missing", () => {
    process.env.SALESFORCE_LOGIN_URL = "test.salesforce.com";
    expect(getSalesforceLoginUrl()).toBe("https://test.salesforce.com");
  });

  it("strips path so authorize is not doubled", () => {
    process.env.SALESFORCE_LOGIN_URL =
      "https://login.salesforce.com/services/oauth2";
    expect(getSalesforceLoginUrl()).toBe("https://login.salesforce.com");
  });
});

describe("getSalesforceRedirectUri", () => {
  const prev = process.env.SALESFORCE_REDIRECT_URI;

  afterEach(() => {
    if (prev === undefined) delete process.env.SALESFORCE_REDIRECT_URI;
    else process.env.SALESFORCE_REDIRECT_URI = prev;
  });

  it("builds from appUrl when override unset", () => {
    delete process.env.SALESFORCE_REDIRECT_URI;
    expect(getSalesforceRedirectUri("http://localhost:3000")).toBe(
      "http://localhost:3000/api/auth/salesforce/callback",
    );
  });

  it("prefers SALESFORCE_REDIRECT_URI when set", () => {
    process.env.SALESFORCE_REDIRECT_URI =
      "https://bizconrsvp.com/api/auth/salesforce/callback";
    expect(getSalesforceRedirectUri("http://localhost:3000")).toBe(
      "https://bizconrsvp.com/api/auth/salesforce/callback",
    );
  });
});

describe("getSalesforceAuthUrl", () => {
  const prevId = process.env.SALESFORCE_CLIENT_ID;
  const prevLogin = process.env.SALESFORCE_LOGIN_URL;
  const prevRedirect = process.env.SALESFORCE_REDIRECT_URI;

  afterEach(() => {
    if (prevId === undefined) delete process.env.SALESFORCE_CLIENT_ID;
    else process.env.SALESFORCE_CLIENT_ID = prevId;
    if (prevLogin === undefined) delete process.env.SALESFORCE_LOGIN_URL;
    else process.env.SALESFORCE_LOGIN_URL = prevLogin;
    if (prevRedirect === undefined) delete process.env.SALESFORCE_REDIRECT_URI;
    else process.env.SALESFORCE_REDIRECT_URI = prevRedirect;
  });

  it("builds absolute https authorize URL with required params and PKCE", () => {
    process.env.SALESFORCE_CLIENT_ID = "3MVG9XgkExampleClientIdValue";
    delete process.env.SALESFORCE_LOGIN_URL;
    delete process.env.SALESFORCE_REDIRECT_URI;

    const { url: href, codeVerifier } = getSalesforceAuthUrl(
      "https://bizconrsvp.com",
      "nonce-abc",
      {
        codeVerifier: "test-verifier-value-32chars-minxx",
        codeChallenge: "test-challenge",
      },
    );
    const url = new URL(href);
    expect(url.href.startsWith("https://")).toBe(true);
    expect(url.origin).toBe("https://login.salesforce.com");
    expect(url.pathname).toBe("/services/oauth2/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe(
      "3MVG9XgkExampleClientIdValue",
    );
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://bizconrsvp.com/api/auth/salesforce/callback",
    );
    expect(url.searchParams.get("scope")).toBe(
      "api refresh_token offline_access",
    );
    expect(url.searchParams.get("state")).toBe("nonce-abc");
    expect(url.searchParams.get("code_challenge")).toBe("test-challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(codeVerifier).toBe("test-verifier-value-32chars-minxx");
  });
});

describe("generateSalesforcePkce", () => {
  it("returns verifier and S256 challenge", () => {
    const { codeVerifier, codeChallenge } = generateSalesforcePkce();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeChallenge.length).toBeGreaterThan(10);
    expect(codeChallenge).not.toBe(codeVerifier);
  });
});

describe("secret encryption (Salesforce token storage)", () => {
  it("round-trips a token string", () => {
    const plain = "salesforce-access-token-example";
    const enc = encryptSecret(plain);
    expect(enc).not.toEqual(plain);
    expect(decryptSecret(enc)).toEqual(plain);
  });
});

describe("parseSalesforceOrgIdFromIdentityUrl", () => {
  it("extracts org id from identity URL path", () => {
    expect(
      parseSalesforceOrgIdFromIdentityUrl(
        "https://login.salesforce.com/id/00Dxx0000001gEF/005xx000001Sv6A",
      ),
    ).toBe("00Dxx0000001gEF");
  });

  it("returns null for invalid URLs", () => {
    expect(parseSalesforceOrgIdFromIdentityUrl(undefined)).toBeNull();
    expect(parseSalesforceOrgIdFromIdentityUrl("not-a-url")).toBeNull();
  });
});

describe("mapSalesforceContact", () => {
  it("maps SOQL fields to contact row", () => {
    expect(
      mapSalesforceContact({
        Id: "003xx",
        FirstName: " Ada ",
        LastName: " Lovelace ",
        Email: "Ada@Example.com",
        Title: "Mathematician",
        Account: { Name: " Analytical Engines " },
      }),
    ).toEqual({
      id: "003xx",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      jobTitle: "Mathematician",
    });
  });

  it("handles null Account and missing fields", () => {
    expect(
      mapSalesforceContact({
        Id: "003yy",
        FirstName: null,
        LastName: null,
        Email: null,
        Title: null,
        Account: null,
      }),
    ).toEqual({
      id: "003yy",
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      jobTitle: "",
    });
  });
});
