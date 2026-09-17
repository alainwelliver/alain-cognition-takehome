import { beforeEach, describe, expect, it } from "vitest";
import { adminTestDb, appTestDb, resetDatabase, USERS } from "../../test/db";
import { approve, execute, propose, reject } from "@/platform";
import { REFUND_KIND, parsePayload } from "./kind";
import { REASON_CODES } from "./reasons";

const TXN = {
  id: "txn_test_1",
  customer: "Ada Byron",
  description: "Pro plan, annual",
  amountCents: 10000,
  chargedAt: new Date("2026-01-14T10:00:00Z"),
};

beforeEach(async () => {
  await resetDatabase();
  await adminTestDb.$executeRawUnsafe(
    "TRUNCATE refunds_refunds, refunds_provider_calls, refunds_transactions RESTART IDENTITY CASCADE",
  );
  await adminTestDb.transaction.create({ data: TXN });
});

function payload(overrides: Partial<{ amountCents: number; reasonCode: string }> = {}) {
  return {
    transactionId: TXN.id,
    amountCents: 2500,
    reasonCode: REASON_CODES[0] as string,
    note: "customer was charged twice",
    ...overrides,
  };
}

describe("the refunds app", () => {
  it("a support user gets 403 when approving a refund they proposed", async () => {
    const approval = await propose(USERS.sam, REFUND_KIND, payload());
    await expect(approve(USERS.sam, approval.id)).rejects.toThrow(/403/);
    expect(await appTestDb.refund.count()).toBe(0);
  });

  it("an engineer gets 403 when proposing a refund", async () => {
    await expect(propose(USERS.eli, REFUND_KIND, payload())).rejects.toThrow(/403/);
  });

  it("an ops lead cannot approve the refund they proposed themselves", async () => {
    const approval = await propose(USERS.olivia, REFUND_KIND, payload());
    await expect(approve(USERS.olivia, approval.id)).rejects.toThrow(
      /cannot decide their own proposal/,
    );
  });

  it("a refund proposed by support and approved by ops executes once and pays once", async () => {
    const approval = await propose(USERS.sam, REFUND_KIND, payload({ amountCents: 2500 }));
    await approve(USERS.olivia, approval.id);
    const receipt = await execute(approval.id);

    expect(receipt).toMatchObject({ idempotencyKey: approval.id, amountCents: 2500 });
    const refund = await appTestDb.refund.findUniqueOrThrow({
      where: { approvalId: approval.id },
    });
    expect(refund).toMatchObject({ transactionId: TXN.id, amountCents: 2500 });
    const calls = await appTestDb.paymentProviderCall.findMany();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ idempotencyKey: approval.id, amountCents: 2500 });
  });

  it("executing an approved refund twice records exactly one payment provider call", async () => {
    const approval = await propose(USERS.sam, REFUND_KIND, payload());
    await approve(USERS.olivia, approval.id);
    const first = await execute(approval.id);
    const second = await execute(approval.id);

    expect(second).toEqual(first);
    const calls = await appTestDb.paymentProviderCall.findMany();
    expect(calls).toHaveLength(1);
    expect(calls[0].idempotencyKey).toBe(approval.id);
    expect(await appTestDb.refund.count()).toBe(1);
  });

  it("a rejected refund never reaches the payment provider", async () => {
    const approval = await propose(USERS.sam, REFUND_KIND, payload());
    await reject(USERS.olivia, approval.id, "customer kept the item");
    await expect(execute(approval.id)).rejects.toThrow(/not approved/);
    expect(await appTestDb.paymentProviderCall.count()).toBe(0);
    expect(await appTestDb.refund.count()).toBe(0);
  });

  it("a partial refund leaves the rest of the transaction refundable", async () => {
    const first = await propose(USERS.sam, REFUND_KIND, payload({ amountCents: 4000 }));
    await approve(USERS.olivia, first.id);
    await execute(first.id);

    const second = await propose(USERS.sam, REFUND_KIND, payload({ amountCents: 6000 }));
    await approve(USERS.olivia, second.id);
    await execute(second.id);

    const refunds = await appTestDb.refund.findMany();
    expect(refunds.map((r) => r.amountCents).sort((a, b) => a - b)).toEqual([4000, 6000]);
  });

  it("a refund for more than the transaction's remaining amount is refused", async () => {
    const approval = await propose(USERS.sam, REFUND_KIND, payload({ amountCents: 10001 }));
    await approve(USERS.olivia, approval.id);
    await expect(execute(approval.id)).rejects.toThrow(/exceeds/);
    expect(await appTestDb.paymentProviderCall.count()).toBe(0);
  });

  it("a proposal with an unknown reason code is refused before it is stored", () => {
    expect(() => parsePayload(payload({ reasonCode: "because" }))).toThrow(/reason code/);
  });

  it("a proposal for a zero or negative amount is refused", () => {
    expect(() => parsePayload(payload({ amountCents: 0 }))).toThrow(/positive/);
  });
});
