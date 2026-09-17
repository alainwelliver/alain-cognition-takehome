import { createHash } from "node:crypto";

export const GENESIS_HASH = "0".repeat(64);

export interface AuditEntry {
  actorId: string;
  action: string;
  entity: string;
  before: unknown;
  after: unknown;
  at: Date;
}

/** Deterministic JSON: object keys sorted at every depth. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
  return `{${entries.join(",")}}`;
}

export function hashEntry(prevHash: string, entry: AuditEntry): string {
  const payload = canonicalJson({
    actor: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    before: entry.before ?? null,
    after: entry.after ?? null,
    at: entry.at.toISOString(),
  });
  return createHash("sha256").update(prevHash + payload).digest("hex");
}
