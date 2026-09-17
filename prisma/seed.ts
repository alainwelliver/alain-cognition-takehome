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

/** app: refunds. Fake charges to search and refund in the demo. */
export const SEED_TRANSACTIONS = [
  { id: "txn_1001", customer: "Ada Byron", description: "Pro plan, annual", amountCents: 24000, chargedAt: new Date("2026-01-14T10:00:00Z") },
  { id: "txn_1002", customer: "Ada Byron", description: "Extra seat", amountCents: 1800, chargedAt: new Date("2026-02-14T10:00:00Z") },
  { id: "txn_1003", customer: "Grace Hopper", description: "Hardware token", amountCents: 4900, chargedAt: new Date("2026-02-20T09:30:00Z") },
  { id: "txn_1004", customer: "Grace Hopper", description: "Pro plan, monthly", amountCents: 2400, chargedAt: new Date("2026-03-01T09:30:00Z") },
  { id: "txn_1005", customer: "Alan Turing", description: "Overage, March", amountCents: 7350, chargedAt: new Date("2026-04-02T18:05:00Z") },
  { id: "txn_1006", customer: "Katherine Johnson", description: "Onboarding workshop", amountCents: 150000, chargedAt: new Date("2026-04-11T14:00:00Z") },
  { id: "txn_1007", customer: "Katherine Johnson", description: "Pro plan, monthly", amountCents: 2400, chargedAt: new Date("2026-05-01T14:00:00Z") },
  { id: "txn_1008", customer: "Shakuntala Devi", description: "Support retainer", amountCents: 50000, chargedAt: new Date("2026-05-09T08:15:00Z") },
  { id: "txn_1009", customer: "Shakuntala Devi", description: "Data export", amountCents: 900, chargedAt: new Date("2026-05-22T08:15:00Z") },
  { id: "txn_1010", customer: "Jean Bartik", description: "Pro plan, annual", amountCents: 24000, chargedAt: new Date("2026-06-03T11:45:00Z") },
];

async function main() {
  for (const user of SEED_USERS) {
    await db.user.upsert({ where: { id: user.id }, create: user, update: user });
  }
  console.log(`seeded ${SEED_USERS.length} users`);

  for (const transaction of SEED_TRANSACTIONS) {
    await db.transaction.upsert({
      where: { id: transaction.id },
      create: transaction,
      update: transaction,
    });
  }
  console.log(`seeded ${SEED_TRANSACTIONS.length} transactions`);

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
