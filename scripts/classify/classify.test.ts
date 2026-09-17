import { describe, expect, it } from "vitest";
import { classify } from "./classify";

const existingApps = new Set(["refunds", "flags"]);
const opts = { appExists: (app: string) => existingApps.has(app) };

describe("classify", () => {
  it("classifies a single component under an existing app as tier 0", () => {
    const result = classify(["src/apps/refunds/components/RefundRow.tsx"], opts);
    expect(result.tier).toBe(0);
    expect(result.reasons).toHaveLength(1);
  });

  it("classifies prisma/seed.ts on its own as tier 0", () => {
    expect(classify(["prisma/seed.ts"], opts).tier).toBe(0);
  });

  it("classifies copy.ts, a test and docs in existing apps as tier 0", () => {
    const result = classify(
      ["src/apps/refunds/copy.ts", "src/apps/flags/flags.test.ts", "docs/controls.md"],
      opts,
    );
    expect(result.tier).toBe(0);
  });

  it("classifies a new directory under src/apps as tier 1", () => {
    const result = classify(["src/apps/kyc/page.tsx"], opts);
    expect(result.tier).toBe(1);
    expect(result.reasons[0]).toContain("new app directory");
  });

  it("classifies actions.ts in an existing app as tier 1", () => {
    expect(classify(["src/apps/refunds/actions.ts"], opts).tier).toBe(1);
  });

  it("classifies src/platform/rbac/roles.ts as tier 2", () => {
    expect(classify(["src/platform/rbac/roles.ts"], opts).tier).toBe(2);
  });

  it("classifies a prisma migration as tier 2", () => {
    expect(classify(["prisma/migrations/20240101000000_init/migration.sql"], opts).tier).toBe(2);
  });

  it("classifies a non-page, non-test file inside an existing app as tier 2", () => {
    expect(classify(["src/apps/refunds/helpers.ts"], opts).tier).toBe(2);
  });

  it("takes the highest tier when tier 0 and tier 2 files are mixed", () => {
    const result = classify(
      ["src/apps/refunds/page.tsx", "prisma/migrations/20240101000000_init/migration.sql"],
      opts,
    );
    expect(result.tier).toBe(2);
    expect(result.reasons).toHaveLength(2);
  });

  it("takes the highest tier when tier 0 and tier 1 files are mixed", () => {
    expect(classify(["prisma/seed.ts", "src/apps/refunds/actions.ts"], opts).tier).toBe(1);
  });

  it("classifies a path that matches no rule as tier 2", () => {
    const result = classify(["infra/thing.yaml"], opts);
    expect(result.tier).toBe(2);
    expect(result.reasons[0]).toContain("matches no tier rule");
  });

  it("classifies an empty list of changed files as tier 2", () => {
    const result = classify([], opts);
    expect(result.tier).toBe(2);
    expect(result.reasons).toEqual(["no changed files detected"]);
  });

  it("ignores blank lines coming from stdin", () => {
    const result = classify(["", "  ", "prisma/seed.ts", ""], opts);
    expect(result.tier).toBe(0);
    expect(result.reasons).toHaveLength(1);
  });
});
