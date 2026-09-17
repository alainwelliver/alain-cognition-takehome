import { describe, expect, it } from "vitest";
import { canonicalJson, hashEntry, GENESIS_HASH } from "./hash";

const entry = {
  actorId: "u_ops",
  action: "refund.execute",
  entity: "refund:1",
  before: null,
  after: { amountCents: 500, reason: "duplicate" },
  at: new Date("2024-01-01T00:00:00.000Z"),
};

describe("audit hashing", () => {
  it("canonical JSON is independent of key order", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));
  });

  it("the same entry always hashes to the same value", () => {
    expect(hashEntry(GENESIS_HASH, entry)).toBe(hashEntry(GENESIS_HASH, entry));
  });

  it("changing any audited field changes the hash", () => {
    const base = hashEntry(GENESIS_HASH, entry);
    expect(hashEntry(GENESIS_HASH, { ...entry, after: { amountCents: 501 } })).not.toBe(base);
    expect(hashEntry(GENESIS_HASH, { ...entry, actorId: "u_support" })).not.toBe(base);
    expect(hashEntry("1".repeat(64), entry)).not.toBe(base);
  });
});
