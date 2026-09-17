import { execSync } from "node:child_process";
import { requireEnv } from "./env";

const url = requireEnv("ADMIN_DATABASE_URL");

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: { ...process.env, ADMIN_DATABASE_URL: url },
});
