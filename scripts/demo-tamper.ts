import { mkdirSync, writeFileSync } from "node:fs";
import pg from "pg";

const { Client } = pg;
import { requireEnv } from "./env";

/** Runs as admin: app_user is not allowed to UPDATE audit rows. */
async function main() {
  const client = new Client({ connectionString: requireEnv("ADMIN_DATABASE_URL") });
  await client.connect();
  const { rows } = await client.query(
    "SELECT * FROM audit_log ORDER BY id ASC OFFSET 2 LIMIT 1",
  );
  const row = rows[0];
  if (!row) throw new Error("no third audit row yet; run npm run demo first");
  mkdirSync(".demo", { recursive: true });
  writeFileSync(".demo/original-row.json", JSON.stringify(row, null, 2));
  await client.query("UPDATE audit_log SET after = $1 WHERE id = $2", [
    JSON.stringify({ ...(row.after ?? {}), tampered: true, amountCents: 999999 }),
    row.id,
  ]);
  await client.end();
  console.log(`tampered with audit row id ${row.id}; original saved to .demo/original-row.json`);
  console.log("now run: npm run verify-audit");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
