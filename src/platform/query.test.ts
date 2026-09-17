import { beforeEach, describe, expect, it } from "vitest";
import { adminTestDb, resetDatabase, USERS } from "../test/db";
import { query } from "./query";

beforeEach(resetDatabase);

describe("platform read helper", () => {
  it("query returns rows the app role can read", async () => {
    await adminTestDb.user.create({
      data: { id: "query-user", name: "Query User", role: "support", email: "query@example.test" },
    });

    const users = await query((tx) => tx.user.findMany({ orderBy: { id: "asc" } }));

    expect(users).toHaveLength(5);
    expect(users.some((user) => user.id === "query-user")).toBe(true);
  });

  it("a write inside query is rejected by the database", async () => {
    await expect(
      query((tx) =>
        tx.user.create({
          data: { id: "query-write", name: "Query Write", role: "support", email: "query-write@example.test" },
        }),
      ),
    ).rejects.toThrow(/read-only/i);
  });
});
