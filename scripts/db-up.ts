import { execSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;
import { requireEnv } from "./env";

/** Starts the compose stack only when nothing is answering already (CI provides its own Postgres). */
async function reachable(url: string): Promise<boolean> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    await client.end().catch(() => {});
    return false;
  }
}

async function main() {
  const url = process.env.CI ? requireEnv("DATABASE_URL") : requireEnv("ADMIN_DATABASE_URL");
  if (await reachable(url)) {
    console.log("postgres is already running");
    return;
  }
  execSync("docker compose up -d", { stdio: "inherit" });
  for (let attempt = 1; attempt <= 60; attempt++) {
    if (await reachable(url)) {
      console.log("postgres is ready");
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("postgres did not become ready in 60s");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
