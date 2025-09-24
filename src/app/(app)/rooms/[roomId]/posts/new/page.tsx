"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TiptapEditor from "@/components/editor/tiptap-editor";

type Post = { id: string; title: string };

export default function NewPostPage({ params }: { params: Promise<{ roomId: string }> }) {
  const router = useRouter();
  const { roomId } = use(params);
  const [category, setCategory] = useState<string>("");
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(["공지", "정보", "질문", "잡담"]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [postsRes, roomRes, catsRes] = await Promise.all([
          fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts?limit=50`, { cache: "no-store" }),
          fetch(`/api/rooms/${encodeURIComponent(roomId)}`, { cache: "no-store" }),
          fetch(`/api/rooms/${encodeURIComponent(roomId)}/categories`, { cache: "no-store" }),
        ]);
        const postsData = await postsRes.json().catch(() => ({}));
        const roomData = await roomRes.json().catch(() => ({}));
        const catsData = await catsRes.json().catch(() => ({}));
        const fromPosts: string[] = Array.from(
          new Set(
            (postsData.posts ?? [])
              .map((p: Post) => p.title.match(/^\s*\[([^\]]{1,12})\]/)?.[1])
              .filter(Boolean)
          )
        );
        const fromTags: string[] = Array.isArray(roomData?.room?.tags) ? roomData.room.tags.slice(0, 8) : [];
        const fromPresets: string[] = Array.isArray(catsData?.categories) ? catsData.categories : [];
        const merged = Array.from(new Set(["공지", "정보", "질문", "잡담", ...fromPresets, ...fromPosts, ...fromTags]));
        if (alive) setCategories(merged);
      } catch {}
    })();
    return () => { alive = false };
  }, [roomId]);

  const finalTitle = useMemo(() => {
    const base = title.trim();
    return category ? `[${category}] ${base}` : base;
  }, [title, category]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (finalTitle.length < 2 || html.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: finalTitle, 
          content: html.trim(), 
          allowComments,
          author: "me" // Add author for consistency
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      
      // Redirect to the created post detail page
      if (data.id) {
        router.push(`/rooms/${encodeURIComponent(roomId)}/posts/${encodeURIComponent(data.id)}`);
      } else {
        // Fallback to room list if no post ID
        router.push(`/rooms/${roomId}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>글쓰기</CardTitle>
            <CardDescription>말머리 · 제목 · 본문(WYSIWYG) · 업로드/임베드</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <select
                    aria-label="말머리"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm min-w-28"
                  >
                    <option value="">말머리 없음</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    maxLength={120}
                    className="flex-1"
                  />
                </div>
                <div className="text-xs text-muted-foreground">최대 120자 · 말머리는 선택 사항입니다.</div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="size-4" />
                  댓글 허용
                </label>
              </div>

              <TiptapEditor value={html} onChange={setHtml} />

              {error && <div className="text-sm text-destructive">{error}</div>}
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={loading || finalTitle.length < 2 || html.trim().length < 2}>{loading ? "올리는 중…" : "게시하기"}</Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
