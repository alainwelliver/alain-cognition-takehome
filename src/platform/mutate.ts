import { db, type Tx } from "./db";
import { appendAudit } from "./audit/write";
import { authorize, type Principal } from "./rbac/authorize";
import type { Action } from "./rbac/roles";

export interface MutationResult<T> {
  entity: string;
  before?: unknown;
  after?: unknown;
  result: T;
}

/**
 * The only write path. Authorizes, opens one transaction, runs the change and
 * appends its audit row before commit: no write can exist without its audit row
 * and no audit row can survive a failed write.
 */
export async function mutate<T>(
  user: Principal,
  action: Action,
  fn: (tx: Tx) => Promise<MutationResult<T>>,
): Promise<T> {
  authorize(user, action);
  return db.$transaction(async (tx) => {
    const outcome = await fn(tx);
    await appendAudit(tx, {
      actorId: user.id,
      action,
      entity: outcome.entity,
      before: outcome.before,
      after: outcome.after,
    });
    return outcome.result;
  });
}
