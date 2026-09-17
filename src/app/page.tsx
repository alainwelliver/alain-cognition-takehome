import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>Foundation</h1>
      <p className="muted">
        Auth stub, RBAC, hash-chained audit log and maker-checker approvals, with thin apps built
        on top.
      </p>
      <div className="cards">
        <Link href="/refunds" className="card">
          <div className="label">app</div>
          <div className="value">Refunds</div>
        </Link>
        <Link href="/flags" className="card">
          <div className="label">app</div>
          <div className="value">Feature flags</div>
        </Link>
        <Link href="/controls" className="card">
          <div className="label">platform</div>
          <div className="value">Controls</div>
        </Link>
      </div>
    </>
  );
}
