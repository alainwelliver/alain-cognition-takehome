import type { PrismaClient } from "@prisma/client";
import type { Tx } from "../db";
import { GENESIS_HASH, hashEntry, type AuditEntry } from "./hash";

/** Namespace for the chain lock; any constant works as long as it is stable. */
export const AUDIT_LOCK_KEY = 4711;

export interface AuditInput {
  actorId: string;
  action: string;
  entity: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Appends one row to the hash chain inside the caller's transaction. The
 * advisory lock is transaction scoped, so concurrent writers serialise here and
 * the chain cannot fork.
 */
export async function appendAudit(tx: Tx | PrismaClient, input: AuditInput) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_LOCK_KEY}::bigint)`;
  const previous = await tx.auditLog.findFirst({ orderBy: { id: "desc" } });
  const prevHash = previous?.hash ?? GENESIS_HASH;
  const at = new Date();
  const entry: AuditEntry = {
    actorId: input.actorId,
    action: input.action,
    entity: input.entity,
    before: input.before ?? null,
    after: input.after ?? null,
    at,
  };
  return tx.auditLog.create({
    data: {
      at,
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      before: (entry.before ?? null) as never,
      after: (entry.after ?? null) as never,
      prevHash,
      hash: hashEntry(prevHash, entry),
    },
  });
}
