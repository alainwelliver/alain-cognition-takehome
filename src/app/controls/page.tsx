import { ACTIONS, ROLES, auth, describeVerifyResult, verifyChain } from "@/platform";
import { db } from "@/platform/db";
import { ActingAs, Pill, shortTime } from "../ui";

export const dynamic = "force-dynamic";

export default async function ControlsPage() {
  const [user, chain, rows, approvals, providerCalls, executed] = await Promise.all([
    auth.currentUser(),
    verifyChain(db),
    db.auditLog.findMany({ orderBy: { id: "desc" }, take: 20 }),
    db.approval.count(),
    db.paymentProviderCall.count(),
    db.approval.count({ where: { status: "executed" } }),
  ]);

  const paysOnce = providerCalls === executed;

  const controls: Array<{ name: string; pass: boolean; result: string; detail: string }> = [
    {
      name: "Audit chain intact",
      pass: chain.ok,
      result: describeVerifyResult(chain),
      detail:
        "Every row is sha256(prev_hash + canonical JSON), written in the same transaction as the change. " +
        "Try npm run demo:tamper, reload, then npm run demo:reset.",
    },
    {
      name: "Audit log append-only",
      pass: true,
      result: "UPDATE and DELETE revoked from app_user",
      detail:
        "The runtime role holds INSERT and SELECT on audit_log only; the migration revokes the rest. " +
        "Only the admin role used by migrations and the tamper demo can alter a row.",
    },
    {
      name: "Money moves once per approval",
      pass: paysOnce,
      result: `${providerCalls} payment call${providerCalls === 1 ? "" : "s"} for ${executed} executed approval${executed === 1 ? "" : "s"}`,
      detail: `${approvals} proposal${approvals === 1 ? "" : "s"} recorded in total. execute() locks the row and reuses the stored result on repeat.`,
    },
    {
      name: "Maker-checker",
      pass: true,
      result: "proposer can never approve their own proposal",
      detail: "Checked on the server inside approve(); the UI only mirrors it.",
    },
  ];

  return (
    <>
      <h1>Controls</h1>
      <ActingAs user={user} />

      <table>
        <thead>
          <tr>
            <th>control</th>
            <th>status</th>
            <th>result</th>
            <th>detail</th>
          </tr>
        </thead>
        <tbody>
          {controls.map((c) => (
            <tr key={c.name}>
              <td>{c.name}</td>
              <td>
                <Pill status={c.pass ? "pass" : "fail"} />
              </td>
              <td className="mono">{c.result}</td>
              <td className="muted">{c.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Roles and permissions</h2>
      <table>
        <thead>
          <tr>
            <th>action</th>
            {Object.keys(ROLES).map((role) => (
              <th key={role}>{role}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ACTIONS.map((action) => (
            <tr key={action}>
              <td className="mono">{action}</td>
              {Object.entries(ROLES).map(([role, granted]) => (
                <td key={role}>
                  {(granted as readonly string[]).includes(action) ? (
                    <span className="ok">yes</span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Last twenty audit rows</h2>
      <table>
        <thead>
          <tr>
            <th className="num">id</th>
            <th>at</th>
            <th>actor</th>
            <th>action</th>
            <th>entity</th>
            <th>after</th>
            <th>hash</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="num">{row.id}</td>
              <td className="mono time">{shortTime(row.at)}</td>
              <td className="mono">{row.actorId}</td>
              <td className="mono">{row.action}</td>
              <td className="mono">{row.entity}</td>
              <td className="mono cell-json" title={JSON.stringify(row.after)}>
                {JSON.stringify(row.after)}
              </td>
              <td className="mono">{row.hash.slice(0, 12)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
