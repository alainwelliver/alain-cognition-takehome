import {
  approve,
  execute,
  mutate,
  propose,
  reject,
  type MutationResult,
  type Principal,
} from "@/platform";
import type { Env } from "./types";
import { FLAG_PROD_KIND } from "./kind";
import "./kind";

export async function setFlag(
  user: Principal,
  key: string,
  env: Env,
  value: boolean,
): Promise<unknown> {
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
  await approve(user, approvalId);
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
