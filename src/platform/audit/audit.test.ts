import { beforeEach, describe, expect, it } from "vitest";
import { adminTestDb, appTestDb, resetDatabase, USERS } from "../../test/db";
import { mutate } from "../mutate";
import { verifyChain } from "./verify";
import { appendAudit } from "./write";

beforeEach(resetDatabase);

describe("the audit log", () => {
  it("a successful write leaves exactly one audit row", async () => {
    await mutate(USERS.olivia, "refund.propose", async (tx) => {
      await tx.user.update({ where: { id: USERS.sam.id }, data: { name: "Sam Support II" } });
      return { entity: `user:${USERS.sam.id}`, before: { name: "Sam Support" }, after: { name: "Sam Support II" }, result: null };
    });
    expect(await appTestDb.auditLog.count()).toBe(1);
  });

  it("a write inside a transaction that fails leaves no audit row", async () => {
    await expect(
      mutate(USERS.olivia, "refund.propose", async (tx) => {
        await tx.user.update({ where: { id: USERS.sam.id }, data: { name: "never committed" } });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await appTestDb.auditLog.count()).toBe(0);
    const sam = await appTestDb.user.findUniqueOrThrow({ where: { id: USERS.sam.id } });
    expect(sam.name).toBe("Sam Support");
  });

  it("an unauthorized write leaves no audit row", async () => {
    await expect(
      mutate(USERS.sam, "refund.approve", async () => ({ entity: "x", result: null })),
    ).rejects.toThrow(/403/);
    expect(await appTestDb.auditLog.count()).toBe(0);
  });

  it("the verifier reports the chain is ok for an untouched chain", async () => {
    for (let i = 0; i < 3; i++) {
      await appendAudit(appTestDb, { actorId: USERS.olivia.id, action: "refund.propose", entity: `refund:${i}`, after: { i } });
    }
    expect(await verifyChain(appTestDb)).toEqual({ ok: true, rows: 3 });
  });

  it("the verifier reports a break at the altered row after an admin edits it", async () => {
    for (let i = 0; i < 3; i++) {
      await appendAudit(appTestDb, { actorId: USERS.olivia.id, action: "refund.propose", entity: `refund:${i}`, after: { i } });
    }
    const second = (await appTestDb.auditLog.findMany({ orderBy: { id: "asc" } }))[1];
    await adminTestDb.$executeRawUnsafe(
      `UPDATE audit_log SET after = '{"i": 99}'::jsonb WHERE id = ${second.id}`,
    );
    const result = await verifyChain(appTestDb);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.brokenAtRow).toBe(2);
  });

  it("concurrent writers produce one unbroken chain", async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        mutate(USERS.olivia, "refund.propose", async () => ({ entity: `refund:${i}`, after: { i }, result: null })),
      ),
    );
    expect(await verifyChain(appTestDb)).toEqual({ ok: true, rows: 8 });
  });
});

describe("the database enforces append-only", () => {
  it("app_user cannot UPDATE an audit row", async () => {
    await appendAudit(appTestDb, { actorId: USERS.olivia.id, action: "refund.propose", entity: "refund:1" });
    await expect(
      appTestDb.$executeRawUnsafe("UPDATE audit_log SET action = 'tampered'"),
    ).rejects.toThrow(/permission denied/i);
  });

  it("app_user cannot DELETE an audit row", async () => {
    await appendAudit(appTestDb, { actorId: USERS.olivia.id, action: "refund.propose", entity: "refund:1" });
    await expect(appTestDb.$executeRawUnsafe("DELETE FROM audit_log")).rejects.toThrow(
      /permission denied/i,
    );
    expect(await appTestDb.auditLog.count()).toBe(1);
  });
});
