import { createElement, type ReactNode } from "react";
import { authorize, ForbiddenError, type Action, type Principal } from "@/platform";

/** Fixed locale and time zone so server and client always render the same text. */
const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const SHORT_TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export function money(cents: number): string {
  return MONEY.format(cents / 100);
}

/** e.g. "Jan 14, 10:00 UTC" */
export function shortTime(at: Date): string {
  return `${SHORT_TIME.format(at)} UTC`;
}

/** e.g. "Jan 14, 2026" */
export function shortDate(at: Date): string {
  return SHORT_DATE.format(at);
}

export type Status = "pending" | "approved" | "rejected" | "executed";

export function Pill({ status, children }: { status: Status | "pass" | "fail"; children?: ReactNode }) {
  return <span className={`pill pill-${status}`}>{children ?? status}</span>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="mono">{children}</span>;
}

export function ActingAs({ user }: { user: Principal | null }) {
  return (
    <p className="acting">
      Acting as{" "}
      <Mono>{user ? `${user.name} (${user.role})` : "nobody"}</Mono>
    </p>
  );
}

export function forbiddenCopy(user: Principal, action: Action) {
  return {
    title: "Not permitted",
    actingAs: `${user.name} (${user.role})`,
    body: `This person can't ${action}.`,
    hint: "Switch user in the header to try as someone else.",
  };
}

export function ForbiddenPanel({ user, action }: { user: Principal; action: Action }) {
  const copy = forbiddenCopy(user, action);
  return (
    <section className="panel panel-forbidden" role="alert">
      <h2>{copy.title}</h2>
      <p>
        You are acting as <Mono>{copy.actingAs}</Mono>. {copy.body}
      </p>
      <p className="hint">{copy.hint}</p>
    </section>
  );
}

/**
 * Server-side gate for a page: runs `authorize` and, if it refuses, returns the
 * panel to render instead of the page. Returns null when the action is allowed.
 */
export function forbiddenPanelFor(user: Principal, action: Action): ReactNode | null {
  try {
    authorize(user, action);
    return null;
  } catch (error) {
    if (error instanceof ForbiddenError) return createElement(ForbiddenPanel, { user, action });
    throw error;
  }
}
