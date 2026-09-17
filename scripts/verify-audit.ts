import { PrismaClient } from "@prisma/client";
import { describeVerifyResult, verifyChain } from "../src/platform/audit/verify";
import { requireEnv } from "./env";

async function main() {
  const client = new PrismaClient({
    datasources: { db: { url: process.env.VERIFY_DATABASE_URL ?? requireEnv("DATABASE_URL") } },
  });
  const result = await verifyChain(client);
  console.log(describeVerifyResult(result));
  await client.$disconnect();
  process.exit(result.ok ? 0 : 1);
}

main();
