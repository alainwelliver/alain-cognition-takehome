import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { UserSwitcher } from "./user-switcher";

export const metadata = { title: "Internal tools foundation" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Link href="/" className="brand">
              Cognition<span>/ internal tools</span>
            </Link>
            <nav>
              <Link href="/refunds">Refunds</Link>
              <Link href="/flags">Feature flags</Link>
              <Link href="/controls">Controls</Link>
            </nav>
          </div>
          <UserSwitcher />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
