import { describe, expect, it } from "vitest";
import { authorize, can, ForbiddenError } from "./authorize";

const sam = { id: "u_support", name: "Sam Support", role: "support" };
const olivia = { id: "u_ops", name: "Olivia Ops", role: "ops_lead" };

describe("authorize", () => {
  it("a support user gets 403 on approving a refund", () => {
    expect(() => authorize(sam, "refund.approve")).toThrow(ForbiddenError);
    expect(() => authorize(sam, "refund.approve")).toThrow(/403/);
  });

  it("an ops lead may approve a refund", () => {
    expect(() => authorize(olivia, "refund.approve")).not.toThrow();
  });

  it("a support user may propose a refund but not touch flags", () => {
    expect(can(sam, "refund.propose")).toBe(true);
    expect(can(sam, "flag.edit.dev")).toBe(false);
  });

  it("an unknown role is denied every action", () => {
    expect(() => authorize({ id: "x", name: "X", role: "intern" }, "refund.view")).toThrow(
      ForbiddenError,
    );
  });
});
