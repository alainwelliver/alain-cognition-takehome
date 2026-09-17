import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "../../app/api/flags/route";
import { verifyChain } from "../../platform/audit/verify";
import { adminTestDb, appTestDb, resetDatabase, USERS } from "../../test/db";
import { approveProd, rejectProd, setFlag } from "./service";

beforeEach(async () => {
  await resetDatabase();
  await adminTestDb.flag.create({
    data: {
      key: "release_flag",
      description: "A test release flag",
      dev: false,
      staging: false,
      prod: false,
    },
  });
});

describe("feature flags", () => {
  it("an engineer can toggle a dev flag and it applies immediately with one audit row", async () => {
    await setFlag(USERS.eli, "release_flag", "dev", true);

    const flag = await appTestDb.flag.findUniqueOrThrow({ where: { key: "release_flag" } });
    expect(flag.dev).toBe(true);
    expect(await appTestDb.auditLog.count()).toBe(1);
  });

  it("an engineer can toggle a staging flag", async () => {
    await setFlag(USERS.eli, "release_flag", "staging", true);

    expect((await appTestDb.flag.findUniqueOrThrow({ where: { key: "release_flag" } })).staging).toBe(true);
  });

  it("a support user gets 403 when toggling a dev flag", async () => {
    await expect(setFlag(USERS.sam, "release_flag", "dev", true)).rejects.toThrow(/403/);
  });

  it("an engineer gets 403 when approving a prod change", async () => {
    const approval = await setFlag(USERS.eli, "release_flag", "prod", true);

    await expect(approveProd(USERS.eli, approval.id)).rejects.toThrow(/403/);
  });

  it("toggling prod does not change the flag until approved", async () => {
    await setFlag(USERS.eli, "release_flag", "prod", true);

    expect((await appTestDb.flag.findUniqueOrThrow({ where: { key: "release_flag" } })).prod).toBe(false);
  });

  it("an eng lead approving a prod proposal executes it once and flips prod", async () => {
    const approval = await setFlag(USERS.eli, "release_flag", "prod", true);

    await approveProd(USERS.lena, approval.id);
    await approveProd(USERS.lena, approval.id);

    expect((await appTestDb.flag.findUniqueOrThrow({ where: { key: "release_flag" } })).prod).toBe(true);
    expect(await appTestDb.auditLog.count()).toBe(3);
    expect(await verifyChain(appTestDb)).toEqual({ ok: true, rows: 3 });
  });

  it("the proposer cannot approve their own prod change", async () => {
    const approval = await setFlag(USERS.lena, "release_flag", "prod", true);

    await expect(approveProd(USERS.lena, approval.id)).rejects.toThrow(/cannot decide their own proposal/);
  });

  it("rejecting a prod proposal leaves prod unchanged", async () => {
    const approval = await setFlag(USERS.eli, "release_flag", "prod", true);

    await rejectProd(USERS.lena, approval.id, "not ready");

    expect((await appTestDb.flag.findUniqueOrThrow({ where: { key: "release_flag" } })).prod).toBe(false);
  });

  it("GET /api/flags?env=prod returns only prod values as JSON", async () => {
    await adminTestDb.flag.update({ where: { key: "release_flag" }, data: { prod: true } });

    const response = await GET(new Request("http://x/api/flags?env=prod"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      env: "prod",
      flags: [{ key: "release_flag", description: "A test release flag", enabled: true }],
    });
  });

  it("an unknown env returns 400", async () => {
    const response = await GET(new Request("http://x/api/flags?env=qa"));

    expect(response.status).toBe(400);
  });
});
