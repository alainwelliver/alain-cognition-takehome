import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>Internal tools, built like software.</h1>
      <p className="muted">
        One platform for sign-in, permissions, an append-only audit chain and maker-checker
        approvals. Every app on top is a thin, reviewable codebase.
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
