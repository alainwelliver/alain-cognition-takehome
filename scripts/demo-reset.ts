import { readFileSync } from "node:fs";
import pg from "pg";

const { Client } = pg;
import { requireEnv } from "./env";

async function main() {
  const row = JSON.parse(readFileSync(".demo/original-row.json", "utf8"));
  const client = new Client({ connectionString: requireEnv("ADMIN_DATABASE_URL") });
  await client.connect();
  await client.query("UPDATE audit_log SET after = $1 WHERE id = $2", [
    row.after === null ? null : JSON.stringify(row.after),
    row.id,
  ]);
  await client.end();
  console.log(`restored audit row id ${row.id}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
