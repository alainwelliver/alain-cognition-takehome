import type { Prisma } from "@prisma/client";
import { db, type Tx } from "../db";
import { appendAudit } from "../audit/write";
import { authorize, ForbiddenError, type Principal } from "../rbac/authorize";
import type { Action } from "../rbac/roles";

export interface ApprovalKind {
  proposeAction: Action;
  /** Either a fixed action or one chosen from the payload (e.g. a lower bar for small amounts). */
  approveAction: Action | ((payload: Prisma.JsonValue) => Action);
  /** Runs at most once per approval. Must be idempotent on idempotencyKey. */
  execute(payload: Prisma.JsonValue, ctx: { idempotencyKey: string; tx: Tx }): Promise<unknown>;
}

const kinds = new Map<string, ApprovalKind>();

export function registerKind(kind: string, definition: ApprovalKind): void {
  kinds.set(kind, definition);
}

function kindOrThrow(kind: string): ApprovalKind {
  const found = kinds.get(kind);
  if (!found) throw new Error(`unknown approval kind: ${kind}`);
  return found;
}

function approveActionFor(definition: ApprovalKind, payload: Prisma.JsonValue): Action {
  return typeof definition.approveAction === "function"
    ? definition.approveAction(payload)
    : definition.approveAction;
}

export async function propose(user: Principal, kind: string, payload: Prisma.InputJsonValue) {
  const definition = kindOrThrow(kind);
  authorize(user, definition.proposeAction);
  return db.$transaction(async (tx) => {
    const approval = await tx.approval.create({
      data: { kind, payload, proposedById: user.id, status: "pending" },
    });
    await appendAudit(tx, {
      actorId: user.id,
      action: "approval.propose",
      entity: `approval:${approval.id}`,
      after: { kind, payload, status: "pending" },
    });
    return approval;
  });
}

export async function approve(user: Principal, approvalId: string) {
  return decide(user, approvalId, "approved");
}

export async function reject(user: Principal, approvalId: string, reason: string) {
  return decide(user, approvalId, "rejected", reason);
}

async function decide(
  user: Principal,
  approvalId: string,
  status: "approved" | "rejected",
  reason?: string,
) {
  return db.$transaction(async (tx) => {
    const approval = await tx.approval.findUniqueOrThrow({ where: { id: approvalId } });
    const definition = kindOrThrow(approval.kind);
    authorize(user, approveActionFor(definition, approval.payload));
    if (approval.proposedById === user.id) {
      throw new ForbiddenError("403: the proposer cannot decide their own proposal");
    }
    if (approval.status !== "pending") {
      throw new Error(`approval ${approvalId} is already ${approval.status}`);
    }
    const updated = await tx.approval.update({
      where: { id: approvalId },
      data: { status, decidedById: user.id, decidedAt: new Date(), rejectReason: reason ?? null },
    });
    await appendAudit(tx, {
      actorId: user.id,
      action: `approval.${status}`,
      entity: `approval:${approvalId}`,
      before: { status: approval.status },
      after: { status, reason: reason ?? null },
    });
    return updated;
  });
}

/**
 * Runs the approved action exactly once. The row lock plus the stored result
 * mean a repeated call (retry, double click, crash after commit) returns the
 * first result instead of moving money twice.
 */
export async function execute(approvalId: string): Promise<unknown> {
  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: string; kind: string; status: string; payload: Prisma.JsonValue; executed_at: Date | null; result: Prisma.JsonValue }[]
    >`SELECT id, kind, status, payload, executed_at, result FROM approvals WHERE id = ${approvalId} FOR UPDATE`;
    const approval = locked[0];
    if (!approval) throw new Error(`unknown approval: ${approvalId}`);
    if (approval.executed_at) return approval.result;
    if (approval.status !== "approved") {
      throw new Error(`approval ${approvalId} is ${approval.status}, not approved`);
    }
    const definition = kindOrThrow(approval.kind);
    const result = await definition.execute(approval.payload, { idempotencyKey: approvalId, tx });
    await tx.approval.update({
      where: { id: approvalId },
      data: { executedAt: new Date(), status: "executed", result: (result ?? null) as never },
    });
    await appendAudit(tx, {
      actorId: "system",
      action: "approval.execute",
      entity: `approval:${approvalId}`,
      before: { status: "approved" },
      after: { status: "executed", result: (result ?? null) as never },
    });
    return result;
  });
}

export function registeredKinds(): string[] {
  return [...kinds.keys()];
}
