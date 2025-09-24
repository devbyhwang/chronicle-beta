// 동적 렌더링 강제 (Next.js 15 버그 해결)
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Chronicle</h1>
      <p>Landing / Marketing page</p>
    </main>
  );
}

