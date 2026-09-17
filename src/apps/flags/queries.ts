import { query } from "@/platform";
import type { Env } from "./types";
import "./kind";

export function listFlags() {
  return query((tx) => tx.flag.findMany({ orderBy: { key: "asc" } }));
}

export function getFlag(key: string) {
  return query((tx) => tx.flag.findUnique({ where: { key } }));
}

export function pendingProdProposals() {
  return query((tx) =>
    tx.approval.findMany({
      where: { kind: "flag.prod", status: "pending" },
      orderBy: { proposedAt: "asc" },
    }),
  );
}

export function flagEnabled(flag: Awaited<ReturnType<typeof listFlags>>[number], env: Env): boolean {
  return flag[env];
}
