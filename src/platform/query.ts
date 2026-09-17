import { db, type Tx } from "./db";

/**
 * The read path for apps; writes inside it are rejected by Postgres.
 */
export async function query<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    return fn(tx);
  });
}
