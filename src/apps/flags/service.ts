import {
  approve,
  execute,
  mutate,
  propose,
  reject,
  type MutationResult,
  type Principal,
  query,
} from "@/platform";
import type { Env } from "./types";
import { FLAG_PROD_KIND, ensureFlagKindRegistered } from "./kind";

ensureFlagKindRegistered();

type ProdApproval = Awaited<ReturnType<typeof propose>>;

export function setFlag(
  user: Principal,
  key: string,
  env: "prod",
  value: boolean,
): ReturnType<typeof propose>;
export function setFlag(
  user: Principal,
  key: string,
  env: Exclude<Env, "prod">,
  value: boolean,
): Promise<unknown>;
export function setFlag(
  user: Principal,
  key: string,
  env: Env,
  value: boolean,
): Promise<ProdApproval | unknown>;
export async function setFlag(user: Principal, key: string, env: Env, value: boolean): Promise<ProdApproval | unknown> {
  if (env === "prod") {
    return propose(user, FLAG_PROD_KIND, { key, value });
  }

  return mutate(user, env === "dev" ? "flag.edit.dev" : "flag.edit.staging", async (tx) => {
    const flag = await tx.flag.findUniqueOrThrow({ where: { key } });
    const before = { [env]: flag[env] };
    const after = { [env]: value };
    await tx.flag.update({ where: { key }, data: { [env]: value } });
    return {
      entity: `flag:${key}`,
      before,
      after,
      result: { ...flag, [env]: value },
    } satisfies MutationResult<unknown>;
  });
}

export async function approveProd(user: Principal, approvalId: string) {
  try {
    await approve(user, approvalId);
  } catch (error) {
    if (!(error instanceof Error) || !/already (approved|executed)/i.test(error.message)) {
      throw error;
    }
  }
  return execute(approvalId);
}

export function rejectProd(user: Principal, approvalId: string, reason: string) {
  return reject(user, approvalId, reason);
}

export function createFlag(user: Principal, key: string, description: string) {
  return mutate(user, "flag.edit.dev", async (tx) => {
    const flag = await tx.flag.create({ data: { key, description } });
    return {
      entity: `flag:${key}`,
      after: { key, description, dev: false, staging: false, prod: false },
      result: flag,
    };
  });
}

export function getApproval(approvalId: string) {
  return query((tx) => tx.approval.findUnique({ where: { id: approvalId } }));
}
