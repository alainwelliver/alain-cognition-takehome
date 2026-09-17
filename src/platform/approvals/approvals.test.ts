import { beforeEach, describe, expect, it } from "vitest";
import { appTestDb, resetDatabase, USERS } from "../../test/db";
import { verifyChain } from "../audit/verify";
import { approve, execute, propose, registerKind, reject } from "./index";

/**
 * A stand-in for an app executor. Apps register their own; the platform only
 * guarantees it runs at most once per approval.
 */
const calls: { idempotencyKey: string; amountCents: number }[] = [];

registerKind("refund", {
  proposeAction: "refund.propose",
  approveAction: "refund.approve",
  async execute(payload, ctx) {
    const amountCents = (payload as { amountCents: number }).amountCents;
    calls.push({ idempotencyKey: ctx.idempotencyKey, amountCents });
    return { refundId: `rf_${calls.length}`, amountCents };
  },
});

registerKind("dynamic-refund", {
  proposeAction: "refund.propose",
  approveAction: (payload) =>
    (payload as { small?: boolean }).small ? "refund.approve.small" : "refund.approve",
  async execute() {
    return null;
  },
});

beforeEach(async () => {
  calls.length = 0;
  await resetDatabase();
});

describe("maker-checker approvals", () => {
  it("a support user gets 403 when approving", async () => {
    const approval = await propose(USERS.sam, "refund", { amountCents: 500 });
    await expect(approve(USERS.sam, approval.id)).rejects.toThrow(/403/);
  });

  it("the proposer cannot approve their own refund", async () => {
    const approval = await propose(USERS.olivia, "refund", { amountCents: 500 });
    await expect(approve(USERS.olivia, approval.id)).rejects.toThrow(
      /cannot decide their own proposal/,
    );
    const stored = await appTestDb.approval.findUniqueOrThrow({ where: { id: approval.id } });
    expect(stored.status).toBe("pending");
  });

  it("a second person can approve a proposal", async () => {
    const approval = await propose(USERS.sam, "refund", { amountCents: 500 });
    const decided = await approve(USERS.olivia, approval.id);
    expect(decided.status).toBe("approved");
    expect(decided.decidedById).toBe(USERS.olivia.id);
  });

  it("an approval kind can choose the approve action from the payload", async () => {
    const small = await propose(USERS.olivia, "dynamic-refund", { small: true });
    await expect(approve(USERS.sam, small.id)).resolves.toMatchObject({ status: "approved" });

    const standard = await propose(USERS.olivia, "dynamic-refund", { small: false });
    await expect(approve(USERS.sam, standard.id)).rejects.toThrow(/403/);
  });

  it("rejecting records the reason and blocks execution", async () => {
    const approval = await propose(USERS.sam, "refund", { amountCents: 500 });
    await reject(USERS.olivia, approval.id, "customer already refunded");
    await expect(execute(approval.id)).rejects.toThrow(/not approved/);
    expect(calls).toHaveLength(0);
  });

  it("an unapproved proposal cannot be executed", async () => {
    const approval = await propose(USERS.sam, "refund", { amountCents: 500 });
    await expect(execute(approval.id)).rejects.toThrow(/not approved/);
  });

  it("executing twice runs the executor once and returns the stored result", async () => {
    const approval = await propose(USERS.sam, "refund", { amountCents: 500 });
    await approve(USERS.olivia, approval.id);
    const first = await execute(approval.id);
    const second = await execute(approval.id);
    expect(calls).toHaveLength(1);
    expect(calls[0].idempotencyKey).toBe(approval.id);
    expect(second).toEqual(first);
  });

  it("two concurrent executions of the same approval run the executor once", async () => {
    const approval = await propose(USERS.sam, "refund", { amountCents: 500 });
    await approve(USERS.olivia, approval.id);
    const results = await Promise.all([execute(approval.id), execute(approval.id)]);
    expect(calls).toHaveLength(1);
    expect(results[0]).toEqual(results[1]);
  });

  it("every approval step leaves the audit chain intact", async () => {
    const approval = await propose(USERS.sam, "refund", { amountCents: 500 });
    await approve(USERS.olivia, approval.id);
    await execute(approval.id);
    const result = await verifyChain(appTestDb);
    expect(result).toEqual({ ok: true, rows: 3 });
  });
});
