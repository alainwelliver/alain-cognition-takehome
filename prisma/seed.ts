import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { appendAudit } from "../src/platform/audit/write";
import { existsSync } from "node:fs";

config({ path: existsSync(".env") ? ".env" : ".env.example" });

const url = process.env.ADMIN_DATABASE_URL;
if (!url) throw new Error("ADMIN_DATABASE_URL is not set");
const db = new PrismaClient({ datasources: { db: { url } } });

/** Fake people. No real personal data anywhere in this repo. */
export const SEED_USERS = [
  { id: "u_support", name: "Sam Support", role: "support", email: "sam@example.test" },
  { id: "u_ops", name: "Olivia Ops", role: "ops_lead", email: "olivia@example.test" },
  { id: "u_eng", name: "Eli Engineer", role: "engineer", email: "eli@example.test" },
  { id: "u_lead", name: "Lena Lead", role: "eng_lead", email: "lena@example.test" },
];

export const SEED_FLAGS = [
  { key: "new_checkout", description: "Use the new checkout flow", dev: true, staging: true, prod: false },
  { key: "dark_mode", description: "Enable dark mode", dev: true, staging: false, prod: false },
  { key: "beta_dashboard", description: "Show the beta dashboard", dev: true, staging: true, prod: false },
  { key: "rate_limit_v2", description: "Use the second rate limiter", dev: false, staging: true, prod: false },
  { key: "export_csv", description: "Enable CSV exports", dev: true, staging: false, prod: true },
  { key: "kyc_fast_path", description: "Enable the KYC fast path", dev: false, staging: false, prod: true },
];

async function main() {
  for (const user of SEED_USERS) {
    await db.user.upsert({ where: { id: user.id }, create: user, update: user });
  }
  console.log(`seeded ${SEED_USERS.length} users`);

  for (const flag of SEED_FLAGS) {
    await db.flag.upsert({ where: { key: flag.key }, create: flag, update: flag });
  }
  console.log(`seeded ${SEED_FLAGS.length} flags`);

  // A few audit rows so /controls and the tamper demo have a chain to walk
  // before any app exists.
  if ((await db.auditLog.count()) === 0) {
    for (const user of SEED_USERS) {
      await appendAudit(db, {
        actorId: user.id,
        action: "user.seed",
        entity: `user:${user.id}`,
        after: { name: user.name, role: user.role },
      });
    }
    console.log(`seeded ${SEED_USERS.length} audit rows`);
  }
  await db.$disconnect();
}

main();
