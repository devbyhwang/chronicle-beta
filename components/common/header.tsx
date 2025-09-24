import Link from "next/link";

export default function Header() {
  return (
    <header style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
      <Link href="/" aria-label="홈으로 이동" style={{ fontWeight: 600 }}>
        Chronicle
      </Link>
    </header>
  );
}
