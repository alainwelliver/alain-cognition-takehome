import { can, type Principal } from "@/platform";
import { approveRefund, proposeRefund, rejectRefund } from "./actions";
import { approveActionFor } from "./kind";
import { REASON_CODES, isReasonCode } from "./reasons";
import { NOTE_LABEL, REASON_LABELS } from "./copy";
import { ActingAs, Pill, money, shortDate, shortTime } from "@/app/ui";

function reasonLabel(code: string): string {
  return isReasonCode(code) ? REASON_LABELS[code] : code;
}

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
  createdAt: Date;
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
  const mayApprove = can(user, "refund.approve");

  return (
    <>
      <h1>Refunds</h1>
      <ActingAs user={user} />
      <p className="muted">
        Proposing needs <code>refund.propose</code>; deciding needs <code>refund.approve</code> (or{" "}
        <code>refund.approve.small</code> for refunds under $50) and never works on your own
        proposal.
      </p>
      {message ? <p className="flash">{message}</p> : null}

      <h2>Transactions</h2>
      <form method="get" className="toolbar">
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
            <th className="num">amount</th>
            <th className="num">refunded</th>
            <th>propose a refund</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const remaining = t.amountCents - t.refundedCents;
            return (
              <tr key={t.id}>
                <td className="mono">{t.id}</td>
                <td>{t.customer}</td>
                <td>{t.description}</td>
                <td className="mono time">{shortDate(t.chargedAt)}</td>
                <td className="num">{money(t.amountCents)}</td>
                <td className="num">{money(t.refundedCents)}</td>
                <td>
                  {!mayPropose ? (
                    <em>not permitted</em>
                  ) : remaining <= 0 ? (
                    <em>fully refunded</em>
                  ) : (
                    <form action={proposeRefund} className="stack">
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
                            {REASON_LABELS[code]}
                          </option>
                        ))}
                      </select>
                      <textarea
                        name="note"
                        rows={3}
                        placeholder={NOTE_LABEL}
                        aria-label={NOTE_LABEL}
                      />
                      <button type="submit" className={mayApprove ? undefined : "primary"}>
                        Propose
                      </button>
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
            <th>status</th>
            <th>transaction</th>
            <th className="num">amount</th>
            <th>reason</th>
            <th>notes</th>
            <th>proposed</th>
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
                <td className="mono">{p.id.slice(0, 8)}…</td>
                <td>
                  <Pill status="pending" />
                </td>
                <td className="mono">{p.transactionId}</td>
                <td className="num">{money(p.amountCents)}</td>
                <td>{reasonLabel(p.reasonCode)}</td>
                <td className="wrap">{p.note || <em>none</em>}</td>
                <td className="mono time">
                  {p.proposedById}
                  <br />
                  <span className="muted">{shortTime(p.proposedAt)}</span>
                </td>
                <td>
                  {!mayDecide ? (
                    <em>not permitted</em>
                  ) : ownProposal ? (
                    <em>your own proposal</em>
                  ) : (
                    <>
                      <form action={approveRefund} className="inline">
                        <input type="hidden" name="approvalId" value={p.id} />
                        <button type="submit" className="primary">
                          Approve and execute
                        </button>
                      </form>
                      <form action={rejectRefund} className="inline" style={{ marginTop: "0.5rem" }}>
                        <input type="hidden" name="approvalId" value={p.id} />
                        <input type="text" name="reason" placeholder="reason" required />
                        <button type="submit" className="danger">
                          Reject
                        </button>
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
            <th>status</th>
            <th className="num">amount</th>
            <th>reason</th>
            <th>executed</th>
            <th>approval / idempotency key</th>
          </tr>
        </thead>
        <tbody>
          {refunds.map((r) => (
            <tr key={r.id}>
              <td className="mono">{r.transactionId}</td>
              <td>
                <Pill status="executed" />
              </td>
              <td className="num">{money(r.amountCents)}</td>
              <td>{reasonLabel(r.reasonCode)}</td>
              <td className="mono time">{shortTime(r.createdAt)}</td>
              <td className="mono">{r.approvalId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
