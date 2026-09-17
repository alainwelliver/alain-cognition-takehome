import { can, auth } from "@/platform";
import { approveProdAction, createFlagAction, rejectProdAction, toggleFlag } from "./actions";
import { listFlags, pendingProdProposals } from "./queries";
import { ENVS } from "./types";

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
      <p>
        Signed in as <code>{user.name} ({user.role})</code>
      </p>
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
              <td><code>{flag.key}</code></td>
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
      {proposals.length === 0 ? <p>None.</p> : (
        <ul>
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <code>{proposal.id}</code>{" "}
              <code>{JSON.stringify(proposal.payload)}</code>
              {can(user, "flag.approve.prod") && (
                <>
                  <form action={approveProdAction}>
                    <input type="hidden" name="approvalId" value={proposal.id} />
                    <button type="submit">approve</button>
                  </form>
                  <form action={rejectProdAction}>
                    <input type="hidden" name="approvalId" value={proposal.id} />
                    <input name="reason" placeholder="reason" required />
                    <button type="submit">reject</button>
                  </form>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2>New flag</h2>
      <form action={createFlagAction}>
        <label>
          key <input name="key" required />
        </label>{" "}
        <label>
          description <input name="description" required />
        </label>{" "}
        <button type="submit" disabled={!can(user, "flag.edit.dev")}>create</button>
      </form>
    </>
  );
}
