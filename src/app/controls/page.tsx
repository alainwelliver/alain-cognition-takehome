import { ACTIONS, ROLES, auth, describeVerifyResult, verifyChain } from "@/platform";
import { db } from "@/platform/db";

export const dynamic = "force-dynamic";

export default async function ControlsPage() {
  const [user, chain, rows, approvals, providerCalls] = await Promise.all([
    auth.currentUser(),
    verifyChain(db),
    db.auditLog.findMany({ orderBy: { id: "desc" }, take: 20 }),
    db.approval.count(),
    db.paymentProviderCall.count(),
  ]);

  return (
    <>
      <h1>Controls</h1>
      <p>
        Signed in as <code>{user ? `${user.name} (${user.role})` : "nobody"}</code>
      </p>

      <h2>Audit chain</h2>
      <p className={chain.ok ? "ok" : "bad"}>{describeVerifyResult(chain)}</p>
      <p>
        Every row is <code>sha256(prev_hash + canonical JSON of the entry)</code>, written in the
        same transaction as the change. Try <code>npm run demo:tamper</code>, reload this page, then{" "}
        <code>npm run demo:reset</code>.
      </p>

      <h2>Append-only, enforced by Postgres</h2>
      <p>
        The runtime role <code>app_user</code> holds INSERT and SELECT on <code>audit_log</code>;
        UPDATE and DELETE are revoked in the migration. Only the <code>admin</code> role used by
        migrations and the tamper demo can alter a row.
      </p>

      <h2>Approvals</h2>
      <p>
        {approvals} proposal{approvals === 1 ? "" : "s"} recorded. The fake payment provider has
        recorded {providerCalls} call{providerCalls === 1 ? "" : "s"}, one per executed refund
        approval.
      </p>

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
              <td>
                <code>{action}</code>
              </td>
              {Object.entries(ROLES).map(([role, granted]) => (
                <td key={role}>{(granted as readonly string[]).includes(action) ? "yes" : ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Last twenty audit rows</h2>
      <table>
        <thead>
          <tr>
            <th>id</th>
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
              <td>{row.id}</td>
              <td>{row.at.toISOString()}</td>
              <td>{row.actorId}</td>
              <td>{row.action}</td>
              <td>{row.entity}</td>
              <td>
                <code>{JSON.stringify(row.after)}</code>
              </td>
              <td>
                <code>{row.hash.slice(0, 12)}…</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
