export const ENVS = ["dev", "staging", "prod"] as const;
export type Env = (typeof ENVS)[number];

export function isEnv(value: string): value is Env {
  return (ENVS as readonly string[]).includes(value);
}
