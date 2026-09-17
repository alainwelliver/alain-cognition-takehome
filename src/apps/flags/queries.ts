import { query } from "@/platform";

export function listFlags() {
  return query((tx) => tx.flag.findMany({ orderBy: { key: "asc" } }));
}

export function pendingProdProposals() {
  return query((tx) =>
    tx.approval.findMany({
      where: { kind: "flag.prod", status: "pending" },
      orderBy: { proposedAt: "asc" },
    }),
  );
}
