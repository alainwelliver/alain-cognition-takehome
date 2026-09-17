import { can, auth } from "@/platform";
import { approveProdAction, createFlagAction, rejectProdAction, toggleFlag } from "./actions";
import { listFlags, pendingProdProposals } from "./queries";
import { ENVS } from "./types";
import { ActingAs, Pill } from "@/app/ui";

export default async function FlagsPage() {
  const [user, flags, proposals] = await Promise.all([
    auth.currentUser(),
    listFlags(),
    pendingProdProposals(),
  ]);
  if (!user) throw new Error("not signed in");

  return (
    <>
      <h1>Feature flags</h1>
      <ActingAs user={user} />
      <table>
        <thead>
          <tr>
            <th>key</th>
            <th>description</th>
            {ENVS.map((env) => <th key={env}>{env}</th>)}
          </tr>
        </thead>
        <tbody>
          {flags.map((flag) => (
            <tr key={flag.key}>
              <td className="mono">{flag.key}</td>
              <td>{flag.description}</td>
              {ENVS.map((env) => {
                const allowed = can(user, env === "dev" ? "flag.edit.dev" : env === "staging" ? "flag.edit.staging" : "flag.propose.prod");
                return (
                  <td key={env}>
                    <form action={toggleFlag}>
                      <input type="hidden" name="key" value={flag.key} />
                      <input type="hidden" name="env" value={env} />
                      <input type="hidden" name="value" value={String(!flag[env])} />
                      <button type="submit" disabled={!allowed}>
                        {flag[env] ? "on" : "off"}{env === "prod" ? ` (propose ${flag.prod ? "off" : "on"})` : ""}
                      </button>
                    </form>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Pending production proposals</h2>
      {proposals.length === 0 ? (
        <p className="muted">None.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>approval</th>
              <th>status</th>
              <th>change</th>
              <th>decide</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((proposal) => (
              <tr key={proposal.id}>
                <td className="mono">{proposal.id.slice(0, 8)}…</td>
                <td>
                  <Pill status="pending" />
                </td>
                <td className="mono">{JSON.stringify(proposal.payload)}</td>
                <td>
                  {can(user, "flag.approve.prod") ? (
                    <>
                      <form action={approveProdAction} className="inline">
                        <input type="hidden" name="approvalId" value={proposal.id} />
                        <button type="submit" className="primary">
                          Approve
                        </button>
                      </form>
                      <form action={rejectProdAction} className="inline" style={{ marginTop: "0.5rem" }}>
                        <input type="hidden" name="approvalId" value={proposal.id} />
                        <input name="reason" placeholder="reason" required />
                        <button type="submit" className="danger">
                          Reject
                        </button>
                      </form>
                    </>
                  ) : (
                    <em>not permitted</em>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>New flag</h2>
      <form action={createFlagAction} className="inline">
        <label>
          key <input name="key" required />
        </label>{" "}
        <label>
          description <input name="description" required />
        </label>{" "}
        <button type="submit" disabled={!can(user, "flag.edit.dev")}>
          Create
        </button>
      </form>
    </>
  );
}
