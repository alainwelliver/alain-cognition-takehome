import { PrismaClient } from "@prisma/client";

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

function url(name: "app" | "admin"): string {
  const key = isTest
    ? name === "app"
      ? "TEST_DATABASE_URL"
      : "TEST_ADMIN_DATABASE_URL"
    : name === "app"
      ? "DATABASE_URL"
      : "ADMIN_DATABASE_URL";
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set`);
  return value;
}

function client(name: "app" | "admin"): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: url(name) } } });
}

const globalForPrisma = globalThis as unknown as {
  appDb?: PrismaClient;
  adminDb?: PrismaClient;
};

/** Least-privilege runtime client. Cannot UPDATE or DELETE audit rows. */
export const db: PrismaClient = globalForPrisma.appDb ?? (globalForPrisma.appDb = client("app"));

/** Superuser client. Migrations, seeds and demo scripts only. */
export const adminDb: PrismaClient =
  globalForPrisma.adminDb ?? (globalForPrisma.adminDb = client("admin"));

export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
