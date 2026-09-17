import { registerKind, type Tx } from "@/platform";
import { payments, type RefundReceipt } from "./payments";
import { isReasonCode, type ReasonCode } from "./reasons";

export const REFUND_KIND = "refund";

export interface RefundPayload {
  transactionId: string;
  amountCents: number;
  reasonCode: ReasonCode;
  note: string;
}

export function parsePayload(payload: unknown): RefundPayload {
  const value = payload as Partial<Record<keyof RefundPayload, unknown>> | null;
  const transactionId = typeof value?.transactionId === "string" ? value.transactionId : "";
  const amountCents = typeof value?.amountCents === "number" ? value.amountCents : NaN;
  const reasonCode = typeof value?.reasonCode === "string" ? value.reasonCode : "";
  const note = typeof value?.note === "string" ? value.note : "";
  if (!transactionId) throw new Error("refund payload needs a transactionId");
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("refund amount must be a positive whole number of cents");
  }
  if (!isReasonCode(reasonCode)) throw new Error(`unknown refund reason code: ${reasonCode}`);
  return { transactionId, amountCents, reasonCode, note };
}

async function executeRefund(
  payload: unknown,
  ctx: { idempotencyKey: string; tx: Tx },
): Promise<RefundReceipt> {
  const refund = parsePayload(payload);
  const transaction = await ctx.tx.transaction.findUniqueOrThrow({
    where: { id: refund.transactionId },
  });
  const alreadyRefunded = await ctx.tx.refund.aggregate({
    where: { transactionId: refund.transactionId },
    _sum: { amountCents: true },
  });
  const remaining = transaction.amountCents - (alreadyRefunded._sum.amountCents ?? 0);
  if (refund.amountCents > remaining) {
    throw new Error(
      `refund of ${refund.amountCents} exceeds the ${remaining} remaining on ${transaction.id}`,
    );
  }
  const receipt = await payments.refund(
    {
      transactionId: refund.transactionId,
      amountCents: refund.amountCents,
      idempotencyKey: ctx.idempotencyKey,
    },
    ctx.tx,
  );
  await ctx.tx.refund.create({
    data: {
      transactionId: refund.transactionId,
      amountCents: refund.amountCents,
      reasonCode: refund.reasonCode,
      approvalId: ctx.idempotencyKey,
    },
  });
  return receipt;
}

registerKind(REFUND_KIND, {
  proposeAction: "refund.propose",
  approveAction: "refund.approve",
  execute: executeRefund,
});
