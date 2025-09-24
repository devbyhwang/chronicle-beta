"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Search, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Room = { id: string; name: string; members?: number };
type Me = { id: string; email: string; name?: string } | null;

export default function Page() {
  const [query, setQuery] = useState("");
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { rooms: Room[] };
        const withMembers = (data.rooms || []).map((r, i) => ({ ...r, members: 20 + i * 7 }));
        if (alive) setRooms(withMembers);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json();
        if (alive) setMe(data.user ?? null);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rooms) return null;
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  }, [rooms, query]);

  // naive recommendation score: popularity + stable hash jitter
  const recScore = (r: Room) => {
    const base = r.members ?? 0;
    let h = 0;
    for (let i = 0; i < r.id.length; i++) h = (h * 31 + r.id.charCodeAt(i)) | 0;
    const jitter = Math.abs(h % 10);
    return base + jitter;
  };
  const recommended = useMemo(() => {
    if (!filtered) return null;
    return filtered.slice().sort((a, b) => recScore(b) - recScore(a)).slice(0, 6);
  }, [filtered]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Top Nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
          <a href="/" className="font-semibold tracking-tight">Chronicle</a>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { k: "all", label: "전체" },
              { k: "popular", label: "인기" },
              { k: "joined", label: "참여중" },
              { k: "topics", label: "주제별" },
            ].map((t) => (
              <a key={t.k} href={`/?tab=${t.k}`} className="px-2.5 py-1.5 rounded-md hover:bg-accent text-sm">
                {t.label}
              </a>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="방/키워드/사용자 검색"
                className="pl-8"
              />
            </div>
            {me ? (
              <>
                <Button variant="outline" asChild>
                  <a href="/rooms/new" className="gap-2"><Plus className="size-4" />새 방 만들기</a>
                </Button>
                <Button variant="ghost" aria-label="알림">
                  <Bell className="size-5" />
                </Button>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await fetch("/api/auth/signout", { method: "POST" });
                    setMe(null);
                  }}
                >
                  <Button type="submit" variant="ghost" className="gap-2">
                    <div className="size-6 rounded-full bg-muted flex items-center justify-center text-xs">
                      {(me.name || me.email).slice(0, 1).toUpperCase()}
                    </div>
                    로그아웃
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <a href="/signin">로그인</a>
                </Button>
                <Button asChild>
                  <a href="/signup">회원가입</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section className="space-y-6">
          {/* My rooms (move to top) */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>내가 참여 중인 방</CardTitle>
                <CardDescription>바로 들어갈 수 있게 상단 고정</CardDescription>
              </div>
              <Button asChild variant="outline"><a href="/rooms">모두 보기</a></Button>
            </CardHeader>
            <CardContent>
              {error && <div className="text-destructive">불러오기 실패: {error}</div>}
              {!filtered && !error && <div className="text-sm text-muted-foreground">로딩 중…</div>}
              {filtered && filtered.length === 0 && (
                <div className="text-sm text-muted-foreground">참여 중인 방이 없습니다.</div>
              )}
              {filtered && filtered.length > 0 && (
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.slice(0, 6).map((r) => (
                    <li key={r.id} className="border border-border rounded-lg p-3 hover:bg-accent/50">
                      <a href={`/rooms/${r.id}`} className="flex items-center justify-between">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-xs text-muted-foreground">{r.members ?? 0}명</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recommended */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>추천 방</CardTitle>
                <CardDescription>관심사와 활동을 바탕으로 선별된 방</CardDescription>
              </div>
              <Button asChild variant="outline"><a href="/rooms">모두 보기</a></Button>
            </CardHeader>
            <CardContent>
              {error && <div className="text-destructive">불러오기 실패: {error}</div>}
              {!recommended && !error && <div className="text-sm text-muted-foreground">로딩 중…</div>}
              {recommended && recommended.length === 0 && (
                <div className="text-sm text-muted-foreground">추천할 방이 없습니다.</div>
              )}
              {recommended && recommended.length > 0 && (
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recommended.map((r) => (
                    <li key={r.id} className="border border-border rounded-lg p-3 hover:bg-accent/50">
                      <a href={`/rooms/${r.id}`} className="flex items-center justify-between">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-xs text-muted-foreground">{r.members ?? 0}명</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          

          {/* Popular */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>지금 인기 방</CardTitle>
                <CardDescription>실시간 순위, 참여자 수 표시</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {filtered && (
                <ul className="grid sm:grid-cols-2 gap-3">
                  {filtered
                    .slice()
                    .sort((a, b) => (b.members ?? 0) - (a.members ?? 0))
                    .slice(0, 6)
                    .map((r, i) => (
                      <li key={r.id} className="border border-border rounded-lg p-3">
                        <a href={`/rooms/${r.id}`} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-muted-foreground">#{i + 1}</span>
                            <span className="font-medium">{r.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{r.members ?? 0}명</span>
                        </a>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* AI dashboard preview */}
          <Card>
            <CardHeader>
              <CardTitle>AI 요약 / 대시보드 미리보기</CardTitle>
              <CardDescription>오늘의 주요 토픽과 커뮤니티 분위기를 한눈에</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3">
                <div className="text-sm font-medium mb-2">주요 토픽 Top 3</div>
                <ul className="text-sm list-disc pl-4 space-y-1">
                  <li>AI 모델 업데이트와 성능 비교</li>
                  <li>프론트엔드 상태관리 베스트 프랙티스</li>
                  <li>실시간 시스템 확장 전략</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-sm font-medium mb-2">분위기/감정 요약</div>
                <p className="text-sm text-muted-foreground">전반적으로 활발(긍정 62%, 논쟁 24%, 질문 14%)</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-sm font-medium mb-2">이슈 하이라이트</div>
                <p className="text-sm text-muted-foreground">베타 기능 릴리즈 관련 피드백 증가</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>실시간 트렌드</CardTitle>
              <CardDescription>커뮤니티 내 🔥 키워드</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["RAG","zustand","Edge","SSE","shadcn","PGVector","OpenAI","WebSocket"].map((k) => (
                  <a key={k} href={`/?q=${encodeURIComponent(k)}`} className="text-xs border border-border rounded-full px-2 py-1 hover:bg-accent">
                    #{k}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>공지사항</CardTitle>
              <CardDescription>업데이트/이벤트 안내</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• 베타 기능: 요약 대시보드 v0.2 공개</p>
              <p>• 신규 유저 웰컴 가이드 업데이트</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Insight</CardTitle>
              <CardDescription>가장 활발한 주제</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              지금은 "AI 모델 업데이트" 관련 토픽이 가장 활발합니다.
            </CardContent>
          </Card>
        </aside>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span>© Chronicle</span>
            <Separator orientation="vertical" className="hidden sm:block" />
            <a className="hover:underline" href="#">이용약관</a>
            <a className="hover:underline" href="#">개인정보처리방침</a>
            <a className="hover:underline" href="#">문의하기</a>
          </div>
          <div className="flex items-center gap-3">
            <span className="opacity-60">v0.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
