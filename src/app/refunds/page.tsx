import { auth } from "@/platform";
import { forbiddenPanelFor } from "../ui";
import { db } from "@/platform/db";
import { RefundsPage, type PendingRow } from "@/apps/refunds/page";
import { REFUND_KIND, parsePayload } from "@/apps/refunds/kind";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; message?: string }>;
}) {
  const { q, message } = await searchParams;
  const query = q ?? "";
  const user = await auth.currentUser();
  if (!user) return <p>No seeded users. Run <code>npm run db:seed</code>.</p>;
  const forbidden = forbiddenPanelFor(user, "refund.view");
  if (forbidden) return forbidden;

  const where = query
    ? {
        OR: [
          { id: { contains: query, mode: "insensitive" as const } },
          { customer: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [transactions, approvals, refunds] = await Promise.all([
    db.transaction.findMany({ where, orderBy: { chargedAt: "desc" }, include: { refunds: true } }),
    db.approval.findMany({
      where: { kind: REFUND_KIND, status: "pending" },
      orderBy: { proposedAt: "desc" },
    }),
    db.refund.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const pending: PendingRow[] = approvals.map((approval) => {
    const payload = parsePayload(approval.payload);
    return {
      id: approval.id,
      proposedById: approval.proposedById,
      proposedAt: approval.proposedAt,
      ...payload,
    };
  });

  return (
    <RefundsPage
      user={user}
      query={query}
      message={message}
      transactions={transactions.map((t) => ({
        id: t.id,
        customer: t.customer,
        description: t.description,
        amountCents: t.amountCents,
        currency: t.currency,
        chargedAt: t.chargedAt,
        refundedCents: t.refunds.reduce((sum, r) => sum + r.amountCents, 0),
      }))}
      pending={pending}
      refunds={refunds.map((r) => ({
        id: r.id,
        transactionId: r.transactionId,
        amountCents: r.amountCents,
        reasonCode: r.reasonCode,
        approvalId: r.approvalId,
        createdAt: r.createdAt,
      }))}
    />
  );
}
