import type { PrismaClient } from "@prisma/client";
import { GENESIS_HASH, hashEntry } from "./hash";

export type VerifyResult =
  | { ok: true; rows: number }
  | { ok: false; rows: number; brokenAtRow: number; brokenId: number };

/** Walks the chain from the first row and recomputes every hash. */
export async function verifyChain(client: PrismaClient): Promise<VerifyResult> {
  const rows = await client.auditLog.findMany({ orderBy: { id: "asc" } });
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const expected = hashEntry(prevHash, {
      actorId: row.actorId,
      action: row.action,
      entity: row.entity,
      before: row.before ?? null,
      after: row.after ?? null,
      at: row.at,
    });
    if (row.prevHash !== prevHash || row.hash !== expected) {
      return { ok: false, rows: rows.length, brokenAtRow: i + 1, brokenId: row.id };
    }
    prevHash = row.hash;
  }
  return { ok: true, rows: rows.length };
}

export function describeVerifyResult(result: VerifyResult): string {
  return result.ok ? `chain ok (${result.rows} rows)` : `chain broken at row ${result.brokenAtRow}`;
}
