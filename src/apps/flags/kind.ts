import { registerKind, type Tx } from "@/platform";

export const FLAG_PROD_KIND = "flag.prod";

registerKind(FLAG_PROD_KIND, {
  proposeAction: "flag.propose.prod",
  approveAction: "flag.approve.prod",
  async execute(payload, { tx }: { idempotencyKey: string; tx: Tx }) {
    const { key, value } = payload as { key: string; value: boolean };
    await tx.flag.update({ where: { key }, data: { prod: value } });
    return { key, prod: value };
  },
});
