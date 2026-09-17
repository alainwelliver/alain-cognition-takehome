import { execSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;
import { APP_ROLE, APP_ROLE_PASSWORD, applyTestEnv } from "./test-env";

/**
 * Brings the test database to a known state: Postgres running, the app_user
 * role present, schema migrated from scratch. Works both against the compose
 * stack and against a bare CI service container.
 */
async function main() {
  execSync("npm run db:up", { stdio: "inherit" });
  const urls = applyTestEnv();

  const client = new Client({ connectionString: urls.admin });
  await client.connect();
  const { rowCount } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [APP_ROLE]);
  if (!rowCount) {
    await client.query(`CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_ROLE_PASSWORD}'`);
  }
  await client.query(`GRANT CONNECT ON DATABASE ${client.database} TO ${APP_ROLE}`);
  await client.end();

  execSync("npx prisma migrate reset --force --skip-generate --skip-seed", {
    stdio: "inherit",
    env: { ...process.env, ADMIN_DATABASE_URL: urls.admin },
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
