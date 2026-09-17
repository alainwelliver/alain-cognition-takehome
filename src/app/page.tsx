import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>Foundation</h1>
      <p>
        Auth stub, RBAC, hash-chained audit log and maker-checker approvals. No apps are built on
        it yet.
      </p>
      <p>
        <Link href="/controls">Controls</Link>
      </p>
      <p>
        <Link href="/flags">Feature flags</Link>
      </p>
    </>
  );
}
