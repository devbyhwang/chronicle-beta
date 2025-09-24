"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Visibility = "public" | "private" | "invite";

export default function NewRoomPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [rules, setRules] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [starred, setStarred] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedTags = useMemo(() => {
    const base = tagsInput
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const merged = Array.from(new Set([...tags, ...base]));
    return merged.slice(0, 8);
  }, [tags, tagsInput]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setError("방 이름을 2자 이상 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || undefined,
          tags: parsedTags,
          rules: rules.trim() || undefined,
          visibility,
          starred,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      const id = data?.id as string | undefined;
      if (id) router.push(`/rooms/${id}`);
      else router.push("/rooms");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">새 방 만들기</h1>
          <p className="text-sm text-muted-foreground">주제를 명확히 적으면 사람들이 더 쉽게 찾아옵니다.</p>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>방 이름과 설명, 공개 범위를 설정하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name">방 이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: AI 모델 업데이트 토론방"
                maxLength={80}
                required
              />
              <div className="text-xs text-muted-foreground">최대 80자</div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc">설명</Label>
              <textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="방 주제와 목적을 간단히 설명하세요."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">태그</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="쉼표 또는 공백으로 구분 (예: AI, RAG, 프론트엔드)"
              />
              {parsedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {parsedTags.map((t) => (
                    <span key={t} className="text-xs border border-border rounded-full px-2 py-1">#{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="visibility">공개 범위</Label>
              <select
                id="visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="public">공개 (누구나 검색/참여)</option>
                <option value="private">비공개 (초대한 사람만 보기)</option>
                <option value="invite">초대 링크로 참여</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rules">방 규칙 (선택)</Label>
              <textarea
                id="rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="예: 친절하게 대화하기, 스팸 금지 등"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="starred"
                type="checkbox"
                checked={starred}
                onChange={(e) => setStarred(e.target.checked)}
                className="size-4"
              />
              <Label htmlFor="starred" className="text-sm">만든 후 내 즐겨찾기에 추가</Label>
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "만드는 중…" : "방 만들기"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
