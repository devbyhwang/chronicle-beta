"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Post = { id: string; title: string; content: string; author?: string; createdAt?: string | Date; views?: number; likes?: number; comments?: number };
type Msg = { id: string; text: string; author: string; createdAt?: string | Date };
type RoomMeta = { id: string; name: string; description?: string | null; tags?: string[]; rules?: string };

type RoomQualityAnalysis = {
  overallScore: number;
  scores: {
    contentDepth: number;
    logicalThinking: number;
    discussion: number;
    creativity: number;
    practicality: number;
  };
  analysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  summary: string;
};

export default function CommunityPanel({ roomId, room, messages, aiSummary }: { roomId: string; room?: RoomMeta; messages?: Msg[]; aiSummary?: string | null }) {
  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomQuality, setRoomQuality] = useState<RoomQualityAnalysis | null>(null);
  const [analyzingQuality, setAnalyzingQuality] = useState(false);

  // Compose post
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<"info" | "posts">("posts");
  const [sort, setSort] = useState<"latest" | "likes" | "comments">("latest");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | "all">("all");
  const composeRef = useState<HTMLDivElement | null>(null)[0];

  // Local community boards (mocked): links/files/media/polls/events
  const [links, setLinks] = useState<Array<{ id: string; title: string; url: string }>>([]);
  const [media, setMedia] = useState<Array<{ id: string; title: string }>>([
    { id: "m1", title: "밈: GPU is life" },
    { id: "m2", title: "데모 스크린샷" },
  ]);
  const [polls, setPolls] = useState<Array<{ id: string; question: string; options: Array<{ k: string; votes: number }> }>>([
    { id: "p1", question: "다음 주제 라이브?", options: [{ k: "RAG", votes: 6 }, { k: "SSE", votes: 3 }, { k: "Vector", votes: 2 }] },
  ]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; date: string }>>([]);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts?limit=20`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setPosts(data.posts ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchPosts();
    return () => { alive = false };
  }, [roomId]);

  // Listen for refresh-posts event
  useEffect(() => {
    const handleRefreshPosts = () => {
      fetchPosts();
    };

    window.addEventListener('refresh-posts', handleRefreshPosts);
    return () => {
      window.removeEventListener('refresh-posts', handleRefreshPosts);
    };
  }, []);


  // Initialize sample events on client to avoid SSR/CSR mismatch
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric" });
    const e = [
      { id: "e1", title: "월간 스터디", date: fmt.format(new Date(Date.now() + 86400000)) },
      { id: "e2", title: "오픈 토론회", date: fmt.format(new Date(Date.now() + 3 * 86400000)) },
    ];
    setEvents(e);
  }, []);

  // Participants (mock): derive from messages authors
  const participants = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: "owner"|"admin"|"mod"|"member"; online: boolean }>();
    (messages ?? []).forEach((m, i) => {
      if (!map.has(m.author)) {
        const role: any = i === 0 ? "owner" : i % 7 === 0 ? "admin" : i % 5 === 0 ? "mod" : "member";
        map.set(m.author, { id: m.author, name: m.author, role, online: i % 3 !== 0 });
      }
    });
    return Array.from(map.values()).slice(0, 12);
  }, [messages]);

  // Insights (mock heuristics)
  const STOP = new Set(["the","a","an","and","or","to","of","in","on","for","is","are","it","this","with","as","at","by","we","you","i","me","our","your","their","they","he","she","them","us","not","no","do","does","did","have","has","had","so","if","then","than","too","very","can","could","should","would","will","about","into","out","up","down","over","under","more","most","less","least","just"]);
  const keywords = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of messages ?? []) {
      const words = (m.text || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s#@_-]/gu, " ")
        .split(/\s+/)
        .filter(Boolean);
      for (const w of words) {
        if (w.length < 2 || STOP.has(w)) continue;
        counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);
  }, [messages]);

  const faq = useMemo(() => (messages ?? []).filter((m) => m.text?.includes("?")).slice(-5).reverse(), [messages]);

  const sentiment = useMemo(() => {
    const posWords = ["good","great","nice","love","👍","😀","감사","좋","최고"]; // naive
    const negWords = ["bad","hate","bug","issue","👎","😡","싫","나쁨","문제"];
    let pos = 0, neg = 0, neu = 0;
    for (const m of messages ?? []) {
      const t = (m.text || "").toLowerCase();
      const p = posWords.some((w) => t.includes(w.toLowerCase()));
      const n = negWords.some((w) => t.includes(w.toLowerCase()));
      if (p && !n) pos++; else if (n && !p) neg++; else neu++;
    }
    const total = Math.max(1, pos+neg+neu);
    return { pos: Math.round((pos/total)*100), neu: Math.round((neu/total)*100), neg: Math.round((neg/total)*100) };
  }, [messages]);

  const highlights = useMemo(() => {
    const arr = (messages ?? []).slice().sort((a,b)=>(b.text?.length??0)-(a.text?.length??0));
    const seen = new Set<string>();
    const out: Msg[] = [];
    for (const m of arr) {
      if (!m.text) continue;
      if (seen.has(m.author)) continue;
      out.push(m);
      seen.add(m.author);
      if (out.length >= 5) break;
    }
    return out;
  }, [messages]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) {
      const m = p.title.match(/^\s*\[([^\]]{1,12})\]/);
      if (m) set.add(m[1]);
    }
    return Array.from(set);
  }, [posts]);

  const filteredSorted = useMemo(() => {
    let arr = posts.slice();
    const query = q.trim().toLowerCase();
    if (category !== "all") arr = arr.filter(p => p.title.includes(`[${category}]`));
    if (query) arr = arr.filter(p => p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query));
    if (sort === "latest") arr.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    if (sort === "likes") arr.sort((a,b) => (b.likes ?? 0) - (a.likes ?? 0));
    if (sort === "comments") arr.sort((a,b) => (b.comments ?? 0) - (a.comments ?? 0));
    return arr;
  }, [posts, q, category, sort]);

  const pageSize = 10;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [q, category, sort]);
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const pageItems = filteredSorted.slice((page-1)*pageSize, page*pageSize);
  const postCount = filteredSorted.length;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2 || content.trim().length < 2) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      const optimistic: Post = {
        id: data.id ?? `post_${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        author: "me",
        createdAt: new Date(),
      };
      setPosts((prev) => [optimistic, ...prev]);
      setTitle("");
      setContent("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  // Ranking by contribution (messages per author)
  const ranking = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of messages ?? []) map.set(m.author, (map.get(m.author) ?? 0) + 1);
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  }, [messages]);

  // Room quality analysis
  const handleAnalyzeRoomQuality = async () => {
    if (analyzingQuality || posts.length === 0) return;
    
    setAnalyzingQuality(true);
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/quality-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '방 질 분석 중 오류가 발생했습니다.');
      }

      setRoomQuality(data.analysis);
    } catch (error) {
      console.error('Room quality analysis error:', error);
      alert(`방 질 분석 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setAnalyzingQuality(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-0">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-2 flex items-center gap-2">
        <button
          className={`text-xs px-2 py-1 rounded border ${view==='info' ? 'bg-accent border-border' : 'border-transparent hover:border-border'}`}
          onClick={() => setView('info')}
          aria-pressed={view==='info'}
        >
          방 정보
        </button>
        <button
          className={`text-xs px-2 py-1 rounded border ${view==='posts' ? 'bg-accent border-border' : 'border-transparent hover:border-border'}`}
          onClick={() => setView('posts')}
          aria-pressed={view==='posts'}
        >
          커뮤니티
        </button>
      </div>
      <div className="space-y-6 px-4 py-4">
        {view === 'info' && (
          <>
        {/* 1) 방 정보 & 맥락 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">방 정보</CardTitle>
            <CardDescription>주제, 목적, 규칙 요약</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {room?.description && <p className="text-sm text-muted-foreground">{room.description}</p>}
            {room?.tags && room.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {room.tags.map((t) => (
                  <span key={t} className="text-xs border border-border rounded-full px-2 py-1">#{t}</span>
                ))}
              </div>
            )}
            {participants.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">참여자</div>
                <ul className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <li key={p.id} className="text-xs border border-border rounded-full px-2 py-1">
                      {p.name} <span className="opacity-60">· {p.role}</span>
                      <span className={`ml-1 inline-block size-1.5 rounded-full ${p.online?"bg-green-500":"bg-zinc-400"}`} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <div className="text-sm font-medium mb-2">공지/고정</div>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>방 규칙: 친절하게 대화하기, 스팸 금지</li>
                <li>운영자 공지: 이번 주 금요일 8시 토론회</li>
                <li>주요 자료: 온보딩 가이드, 모델 벤치마크 링크</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 2) 방 수준 평가 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">방 수준 평가</CardTitle>
            <CardDescription>게시글 기반 방의 수준 분석</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">총 {posts.length}개 게시글 분석</span>
              <Button
                onClick={handleAnalyzeRoomQuality}
                disabled={analyzingQuality || posts.length === 0}
                variant="outline"
                size="sm"
              >
                {analyzingQuality ? '분석 중...' : '📊 방 수준 분석하기'}
              </Button>
            </div>

            {roomQuality && (
              <div className="space-y-4">
                {/* Overall Score */}
                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {roomQuality.overallScore}점
                  </div>
                  <div className="text-sm text-muted-foreground">종합 점수</div>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">세부 평가</h4>
                  {Object.entries(roomQuality.scores).map(([key, score]) => {
                    const labels = {
                      contentDepth: '내용의 깊이',
                      logicalThinking: '논리적 사고',
                      discussion: '토론과 상호작용',
                      creativity: '창의성',
                      practicality: '실용성'
                    };
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{labels[key as keyof typeof labels]}</span>
                          <span className="font-medium">{score}점</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Analysis Summary */}
                <div className="p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">분석 요약</h4>
                  <p className="text-sm text-muted-foreground">{roomQuality.summary}</p>
                </div>

                {/* Strengths and Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">강점</h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      {roomQuality.analysis.strengths.map((strength, index) => (
                        <li key={index}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">개선점</h4>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {roomQuality.analysis.weaknesses.map((weakness, index) => (
                        <li key={index}>• {weakness}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">개선 제안</h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    {roomQuality.analysis.recommendations.map((recommendation, index) => (
                      <li key={index}>• {recommendation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3) 대화 요약 & 메타 인사이트 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI 요약 & 인사이트</CardTitle>
            <CardDescription>오늘의 대화 스냅샷</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiSummary && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">🤖 AI 요약</div>
                <div className="text-sm text-blue-800 dark:text-blue-200">{aiSummary}</div>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium mb-2">핵심 키워드</div>
              {keywords.length === 0 ? (
                <div className="text-xs text-muted-foreground">데이터가 충분하지 않습니다.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {keywords.map(([k, c]) => (
                    <span key={k} className="text-xs border border-border rounded-full px-2 py-1">#{k} <span className="opacity-60">×{c}</span></span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium mb-2">분위기 지표</div>
              <div className="text-xs text-muted-foreground">긍정 {sentiment.pos}% · 중립 {sentiment.neu}% · 부정 {sentiment.neg}%</div>
              <div className="mt-2 h-2 bg-muted rounded">
                <div className="h-full bg-green-500 rounded-l" style={{ width: `${sentiment.pos}%` }} />
                <div className="h-full bg-zinc-400" style={{ width: `${sentiment.neu}%` }} />
                <div className="h-full bg-red-500 rounded-r" style={{ width: `${sentiment.neg}%` }} />
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium mb-2">하이라이트</div>
              <ul className="text-xs space-y-1">
                {highlights.slice(0,3).map((m) => (
                  <li key={m.id}><span className="font-medium">{m.author}</span>: <span className="text-muted-foreground">{m.text}</span></li>
                ))}
                {highlights.length === 0 && <li className="text-muted-foreground">하이라이트가 없습니다.</li>}
              </ul>
            </div>
            </div>
          </CardContent>
        </Card>

        {faq.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">주요 Q&A</CardTitle>
              <CardDescription>최근 질문과 답변</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {faq.map((q) => (
                <div key={q.id} className="text-sm">
                  <span className="font-medium">Q.</span> <span className="text-muted-foreground">{q.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 3) 자료 & 콘텐츠 공유 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">자료/링크 공유</CardTitle>
            <CardDescription>문서, 링크, 참고 자료</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const url = (e.currentTarget as any).url?.value?.trim();
                const title = (e.currentTarget as any).ltitle?.value?.trim();
                if (!url) return;
                setLinks((prev) => [{ id: `l_${Date.now()}`, title: title || url, url }, ...prev]);
                (e.currentTarget as any).reset();
              }}
              className="flex items-center gap-2"
            >
              <Input name="ltitle" placeholder="제목(선택)" />
              <Input name="url" placeholder="https://링크" />
              <Button type="submit" variant="outline">추가</Button>
            </form>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.id} className="text-sm">
                  <a href={l.url} target="_blank" className="hover:underline font-medium">{l.title}</a>
                  <span className="text-xs text-muted-foreground ml-2">{l.url}</span>
                </li>
              ))}
              {links.length === 0 && <li className="text-sm text-muted-foreground">공유된 링크가 없습니다.</li>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">미디어 보드</CardTitle>
            <CardDescription>이미지/영상 모음</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-2 gap-2">
              {media.map((m) => (
                <li key={m.id} className="aspect-video rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  {m.title}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 4) 참여 & 활동 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">투표/설문</CardTitle>
            <CardDescription>의견 수렴</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = (e.currentTarget as any).q?.value?.trim();
                if (!q) return;
                setPolls((prev) => [{ id: `p_${Date.now()}`, question: q, options: [] }, ...prev]);
                (e.currentTarget as any).reset();
              }}
              className="flex items-center gap-2"
            >
              <Input name="q" placeholder="질문 입력(예: 다음 주제?)" />
              <Button type="submit" variant="outline">만들기</Button>
            </form>
            <ul className="space-y-2">
              {polls.map((p) => (
                <li key={p.id} className="text-sm">
                  <div className="font-medium">{p.question}</div>
                  <div className="flex gap-2 mt-1">
                    {p.options.length === 0 && <span className="text-xs text-muted-foreground">옵션 없음</span>}
                    {p.options.map((o, i) => (
                      <button key={i} className="text-xs px-2 py-1 rounded border border-border hover:bg-accent">
                        {o.k} <span className="opacity-60">({o.votes})</span>
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">이벤트 캘린더</CardTitle>
            <CardDescription>모임/회의/데드라인</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {events.map((ev) => (
                <li key={ev.id}>{ev.date} · {ev.title}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">활동 랭킹</CardTitle>
            <CardDescription>기여도(메시지 수 기준)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {ranking.map(([name, n], i) => (
                <li key={name}>#{i+1} {name} <span className="text-muted-foreground">· {n}회</span></li>
              ))}
              {ranking.length === 0 && <li className="text-muted-foreground">집계할 메시지가 없습니다.</li>}
            </ul>
          </CardContent>
        </Card>

        </>
        )}

        {view === 'posts' && (
          <>
          {/* Toolbar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">커뮤니티</CardTitle>
              <CardDescription>국내 커뮤니티형 리스트 레이아웃</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 items-center">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="all">전체 말머리</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 text-xs">
                <button onClick={() => setSort('latest')} className={`px-2 py-1 rounded border ${sort==='latest'?'bg-accent border-border':'border-transparent hover:border-border'}`}>최신</button>
                <button onClick={() => setSort('likes')} className={`px-2 py-1 rounded border ${sort==='likes'?'bg-accent border-border':'border-transparent hover:border-border'}`}>추천</button>
                <button onClick={() => setSort('comments')} className={`px-2 py-1 rounded border ${sort==='comments'?'bg-accent border-border':'border-transparent hover:border-border'}`}>댓글</button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색" className="h-9 w-40" />
                <a href={`/rooms/${encodeURIComponent(roomId)}/posts/new`} className="px-3 h-9 inline-flex items-center rounded-md border border-border hover:bg-accent text-sm">글쓰기</a>
              </div>
            </CardContent>
          </Card>

          {/* List table */}
          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-0 bg-muted px-3 py-2 text-xs">
              <div className="w-10">번호</div>
              <div>제목</div>
              <div className="w-24 text-right pr-2">작성자</div>
              <div className="w-24 text-right pr-2">날짜</div>
              <div className="w-16 text-right pr-2">조회</div>
              <div className="w-16 text-right pr-2">추천/댓글</div>
            </div>
            <ul>
              {pageItems.map((p, idx) => {
                const globalIndex = (page-1)*pageSize + idx + 1;
                const cat = (p.title.match(/^\s*\[([^\]]{1,12})\]/)?.[1]) || null;
                return (
                  <li key={p.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-0 items-center border-t px-3 py-2 text-sm">
                    <div className="w-10 text-xs text-muted-foreground">{globalIndex}</div>
                    <div className="min-w-0">
                      <a href={`/rooms/${encodeURIComponent(roomId)}/posts/${encodeURIComponent(p.id)}`} className="hover:underline truncate">
                        {cat && <span className="mr-1 text-xs border rounded px-1 py-0.5 align-middle">[{cat}]</span>}
                        <span className="align-middle">{p.title.replace(/^\s*\[[^\]]+\]\s*/, '')}</span>
                      </a>
                    </div>
                    <div className="w-24 text-right pr-2 text-xs text-muted-foreground truncate">{p.author || 'anon'}</div>
                    <div className="w-24 text-right pr-2 text-xs text-muted-foreground">{new Date(p.createdAt || Date.now()).toLocaleDateString('ko-KR')}</div>
                    <div className="w-16 text-right pr-2 text-xs">{p.views ?? 0}</div>
                    <div className="w-16 text-right pr-2 text-xs">{p.likes ?? 0}/{p.comments ?? 0}</div>
                  </li>
                );
              })}
              {pageItems.length === 0 && (
                <li className="border-t px-3 py-6 text-center text-sm text-muted-foreground">게시글이 없습니다.</li>
              )}
            </ul>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <button className="px-2 py-1 rounded border border-border disabled:opacity-50" disabled={page<=1} onClick={() => setPage((p)=>Math.max(1,p-1))}>이전</button>
            <span className="text-xs">{page} / {totalPages}</span>
            <button className="px-2 py-1 rounded border border-border disabled:opacity-50" disabled={page>=totalPages} onClick={() => setPage((p)=>Math.min(totalPages,p+1))}>다음</button>
          </div>

          {/* Composer moved to /posts/new (removed inline section) */}
        </>
        )}
      </div>
    </div>
  );
}
