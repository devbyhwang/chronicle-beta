"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RoomSettingsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const [roomId, setRoomId] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resolvedParams = await params;
        setRoomId(resolvedParams.roomId);
        
        const res = await fetch(`/api/rooms/${encodeURIComponent(resolvedParams.roomId)}/categories`, { cache: "no-store" });
        const data = await res.json();
        if (alive) setCategories(data.categories ?? []);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false };
  }, [params]);

  async function add() {
    if (!name.trim()) return;
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: name.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setCategories(data.categories ?? []);
      setName("");
    }
  }

  async function remove(cat: string) {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/categories?category=${encodeURIComponent(cat)}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) setCategories(data.categories ?? []);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">방 설정</h1>
      <section className="space-y-3">
        <h2 className="text-base font-medium">말머리 프리셋</h2>
        <div className="flex items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="말머리 입력(예: 공지)" />
          <Button onClick={add}>추가</Button>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        {loading && <div className="text-sm text-muted-foreground">불러오는 중…</div>}
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c} className="text-xs border rounded px-2 py-1 flex items-center gap-2">
              {c}
              <button className="text-muted-foreground" onClick={() => remove(c)}>×</button>
            </li>
          ))}
          {!loading && categories.length === 0 && <li className="text-sm text-muted-foreground">등록된 프리셋이 없습니다.</li>}
        </ul>
      </section>
    </div>
  );
}
