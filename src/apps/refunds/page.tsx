import { can, type Principal } from "@/platform";
import { approveRefund, proposeRefund, rejectRefund } from "./actions";
import { approveActionFor } from "./kind";
import { REASON_CODES } from "./reasons";

export interface TransactionRow {
  id: string;
  customer: string;
  description: string;
  amountCents: number;
  currency: string;
  chargedAt: Date;
  refundedCents: number;
}

export interface PendingRow {
  id: string;
  proposedById: string;
  proposedAt: Date;
  transactionId: string;
  amountCents: number;
  reasonCode: string;
  note: string;
}

export interface RefundRow {
  id: string;
  transactionId: string;
  amountCents: number;
  reasonCode: string;
  approvalId: string;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function RefundsPage({
  user,
  query,
  message,
  transactions,
  pending,
  refunds,
}: {
  user: Principal;
  query: string;
  message?: string;
  transactions: TransactionRow[];
  pending: PendingRow[];
  refunds: RefundRow[];
}) {
  const mayPropose = can(user, "refund.propose");

  return (
    <>
      <h1>Refunds</h1>
      <p>
        Signed in as <code>{`${user.name} (${user.role})`}</code>. Proposing needs{" "}
        <code>refund.propose</code>; deciding needs <code>refund.approve</code> (or{" "}
        <code>refund.approve.small</code> for refunds under $50) and never works on your own
        proposal.
      </p>
      {message ? <p className="ok">{message}</p> : null}

      <h2>Transactions</h2>
      <form method="get">
        <input type="search" name="q" defaultValue={query} placeholder="customer, id or text" />
        <button type="submit">Search</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>customer</th>
            <th>description</th>
            <th>charged</th>
            <th>amount</th>
            <th>refunded</th>
            <th>propose a refund</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const remaining = t.amountCents - t.refundedCents;
            return (
              <tr key={t.id}>
                <td>
                  <code>{t.id}</code>
                </td>
                <td>{t.customer}</td>
                <td>{t.description}</td>
                <td>{t.chargedAt.toISOString().slice(0, 10)}</td>
                <td>{money(t.amountCents)}</td>
                <td>{money(t.refundedCents)}</td>
                <td>
                  {!mayPropose ? (
                    <em>not permitted</em>
                  ) : remaining <= 0 ? (
                    <em>fully refunded</em>
                  ) : (
                    <form action={proposeRefund}>
                      <input type="hidden" name="transactionId" value={t.id} />
                      <input
                        type="number"
                        name="amount"
                        step="0.01"
                        min="0.01"
                        max={(remaining / 100).toFixed(2)}
                        defaultValue={(remaining / 100).toFixed(2)}
                        required
                      />
                      <select name="reasonCode" defaultValue={REASON_CODES[0]}>
                        {REASON_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                      <input type="text" name="note" placeholder="note (optional)" />
                      <button type="submit">Propose</button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Pending approvals</h2>
      {pending.length === 0 ? <p>Nothing pending.</p> : null}
      <table>
        <thead>
          <tr>
            <th>approval</th>
            <th>transaction</th>
            <th>amount</th>
            <th>reason</th>
            <th>note</th>
            <th>proposed by</th>
            <th>decide</th>
          </tr>
        </thead>
        <tbody>
          {pending.map((p) => {
            const ownProposal = p.proposedById === user.id;
            const mayDecide = can(
              user,
              approveActionFor({
                transactionId: p.transactionId,
                amountCents: p.amountCents,
                reasonCode: p.reasonCode,
                note: p.note,
              }),
            );
            return (
              <tr key={p.id}>
                <td>
                  <code>{p.id.slice(0, 8)}…</code>
                </td>
                <td>
                  <code>{p.transactionId}</code>
                </td>
                <td>{money(p.amountCents)}</td>
                <td>{p.reasonCode}</td>
                <td>{p.note}</td>
                <td>{p.proposedById}</td>
                <td>
                  {!mayDecide ? (
                    <em>not permitted</em>
                  ) : ownProposal ? (
                    <em>your own proposal</em>
                  ) : (
                    <>
                      <form action={approveRefund}>
                        <input type="hidden" name="approvalId" value={p.id} />
                        <button type="submit">Approve and execute</button>
                      </form>
                      <form action={rejectRefund}>
                        <input type="hidden" name="approvalId" value={p.id} />
                        <input type="text" name="reason" placeholder="reason" required />
                        <button type="submit">Reject</button>
                      </form>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Executed refunds</h2>
      <table>
        <thead>
          <tr>
            <th>transaction</th>
            <th>amount</th>
            <th>reason</th>
            <th>approval / idempotency key</th>
          </tr>
        </thead>
        <tbody>
          {refunds.map((r) => (
            <tr key={r.id}>
              <td>
                <code>{r.transactionId}</code>
              </td>
              <td>{money(r.amountCents)}</td>
              <td>{r.reasonCode}</td>
              <td>
                <code>{r.approvalId}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
