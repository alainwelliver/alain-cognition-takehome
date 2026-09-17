import { PrismaClient } from "@prisma/client";
import { db } from "../platform/db";

export const adminTestDb = new PrismaClient({
  datasources: { db: { url: process.env.TEST_ADMIN_DATABASE_URL! } },
});

export const appTestDb = db;

export const USERS = {
  sam: { id: "u_support", name: "Sam Support", role: "support" },
  olivia: { id: "u_ops", name: "Olivia Ops", role: "ops_lead" },
  eli: { id: "u_eng", name: "Eli Engineer", role: "engineer" },
  lena: { id: "u_lead", name: "Lena Lead", role: "eng_lead" },
};

export async function resetDatabase() {
  await adminTestDb.$executeRawUnsafe("TRUNCATE approvals, audit_log, flags RESTART IDENTITY");
  await adminTestDb.user.deleteMany();
  await adminTestDb.user.createMany({
    data: Object.values(USERS).map((u) => ({ ...u, email: `${u.id}@example.test` })),
  });
}
