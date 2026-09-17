import { config } from "dotenv";
import { existsSync } from "node:fs";

config({ path: existsSync(".env") ? ".env" : ".env.example" });

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; copy .env.example to .env`);
  return value;
}
