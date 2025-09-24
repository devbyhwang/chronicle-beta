import type { ReactNode } from "react";
import Link from "next/link";

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100dvh" }}>
      <header style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
        <Link href="/" aria-label="홈으로 이동" style={{ fontWeight: 600 }}>
          Chronicle
        </Link>
      </header>
      <main style={{ padding: 24, overflow: "hidden", height: "100%", boxSizing: "border-box" }}>{children}</main>
    </div>
  );
}
