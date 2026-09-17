import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>Foundation</h1>
      <p>
        Auth stub, RBAC, hash-chained audit log and maker-checker approvals, with thin apps built
        on top.
      </p>
      <p>
        <Link href="/refunds">Refunds</Link> · <Link href="/controls">Controls</Link>
      </p>
    </>
  );
}
