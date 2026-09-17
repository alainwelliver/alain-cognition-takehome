import { describe, expect, it } from "vitest";
import { OidcAuthProvider } from "./oidc";

describe("the OIDC provider stub", () => {
  it("throws not implemented until a real identity provider is wired up", async () => {
    await expect(new OidcAuthProvider().currentUser()).rejects.toThrow(/not implemented/);
  });
});
