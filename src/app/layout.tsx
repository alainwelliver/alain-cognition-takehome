import type { ReactNode } from "react";
import "./globals.css";
import { UserSwitcher } from "./user-switcher";

export const metadata = { title: "Internal tools foundation" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <strong>Internal tools foundation</strong>
          <UserSwitcher />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
