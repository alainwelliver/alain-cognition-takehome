import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import { USERS } from "../test/db";
import { ForbiddenPanel, forbiddenCopy, forbiddenPanelFor, money, shortTime } from "./ui";

describe("the forbidden panel", () => {
  it("a user without refund.view sees a panel naming who they are acting as and a hint to switch user", () => {
    const panel = forbiddenPanelFor(USERS.eli, "refund.view");
    expect(isValidElement(panel)).toBe(true);
    if (!isValidElement(panel)) throw new Error("unreachable");
    expect(panel.type).toBe(ForbiddenPanel);
    expect(panel.props).toEqual({ user: USERS.eli, action: "refund.view" });

    const copy = forbiddenCopy(USERS.eli, "refund.view");
    expect(copy.actingAs).toBe("Eli Engineer (engineer)");
    expect(copy.body).toBe("This person can't refund.view.");
    expect(copy.hint).toMatch(/switch user in the header/i);
  });

  it("a user with refund.view gets no panel and sees the page", () => {
    expect(forbiddenPanelFor(USERS.sam, "refund.view")).toBeNull();
  });
});

describe("display formatting", () => {
  it("renders money as dollars and timestamps in a fixed zone so server and client agree", () => {
    expect(money(123456)).toBe("$1,234.56");
    expect(money(5)).toBe("$0.05");
    expect(shortTime(new Date("2026-01-14T10:05:00Z"))).toBe("Jan 14, 10:05 UTC");
  });
});
