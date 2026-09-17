import type { Tx } from "@/platform";

export interface RefundRequest {
  transactionId: string;
  amountCents: number;
  idempotencyKey: string;
}

export interface RefundReceipt {
  providerRef: string;
  transactionId: string;
  amountCents: number;
  idempotencyKey: string;
  replayed: boolean;
}

export interface PaymentProvider {
  refund(request: RefundRequest, tx: Tx): Promise<RefundReceipt>;
}

/**
 * Stand-in for a real processor. Every call is recorded and a repeated
 * idempotency key returns the first receipt without recording a second call.
 */
export class FakePaymentProvider implements PaymentProvider {
  async refund(request: RefundRequest, tx: Tx): Promise<RefundReceipt> {
    const existing = await tx.paymentProviderCall.findUnique({
      where: { idempotencyKey: request.idempotencyKey },
    });
    if (existing) {
      return {
        providerRef: existing.providerRef,
        transactionId: existing.transactionId,
        amountCents: existing.amountCents,
        idempotencyKey: existing.idempotencyKey,
        replayed: true,
      };
    }
    const call = await tx.paymentProviderCall.create({
      data: {
        idempotencyKey: request.idempotencyKey,
        transactionId: request.transactionId,
        amountCents: request.amountCents,
        providerRef: `fake_${request.idempotencyKey}`,
      },
    });
    return {
      providerRef: call.providerRef,
      transactionId: call.transactionId,
      amountCents: call.amountCents,
      idempotencyKey: call.idempotencyKey,
      replayed: false,
    };
  }
}

export const payments: PaymentProvider = new FakePaymentProvider();
