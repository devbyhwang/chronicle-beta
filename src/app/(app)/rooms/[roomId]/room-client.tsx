"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CommunityPanel from "@/components/room/community-panel";
import MessageItem from "@/components/common/message-item";
import ChatInput from "@/components/common/chat-input";
import { Button } from "@/components/ui/button";

type Msg = { id: string; text: string; author: string; createdAt?: string | Date };

type RoomMeta = { id: string; name: string; description?: string | null; tags?: string[] };

export default function RoomClient({ roomId, room }: { roomId: string; room?: RoomMeta }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  
  // AI sync state
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<{ title: string; content: string } | null>(null);
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [editingPreview, setEditingPreview] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/messages`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
        if (alive) setMessages(data.messages ?? []);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const title = useMemo(() => room?.name || `Room ${roomId}`, [room?.name, roomId]);

  // AI sync function
  const handleAISync = async () => {
    if (!messages || messages.length === 0) {
      alert('채팅 내용이 없습니다.');
      return;
    }

    setIsGenerating(true);
    setAiSummary(null);
    setAiPreview(null);
    setShowAiPreview(false);
    
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/ai/generate-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: 'me', // 현재 사용자
          messageCount: 50 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('AI sync error response:', data);
        throw new Error(data.message || 'AI 동기화 실패');
      }

      // 내용이 부족한 경우
      if (data.success === false) {
        alert(`AI 판단: ${data.message}`);
        return;
      }

      // AI가 생성한 내용을 미리보기로 설정
      if (data.post) {
        setAiPreview({
          title: data.post.title,
          content: data.post.content
        });
        setEditTitle(data.post.title);
        setEditContent(data.post.content);
        setShowAiPreview(true);
        setEditingPreview(false);
      }
      
      setAiSummary(data.summary);
      
    } catch (error) {
      console.error('AI sync error:', error);
      alert(`AI 동기화 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmPost = async () => {
    if (!aiPreview) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingPreview ? editTitle : aiPreview.title,
          content: editingPreview ? editContent : aiPreview.content,
          author: 'me'
        }),
      });

      if (!response.ok) {
        throw new Error('게시글 등록 실패');
      }

      // AI sync timestamp 기록
      await fetch(`/api/rooms/${roomId}/ai/record-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'me' }),
      });

      // 성공 시 미리보기 초기화
      setAiPreview(null);
      setShowAiPreview(false);
      setEditingPreview(false);
      setEditTitle('');
      setEditContent('');
      
      // 게시글 목록 새로고침
      window.dispatchEvent(new CustomEvent('refresh-posts'));
      
      alert('게시글이 성공적으로 등록되었습니다!');
    } catch (error) {
      console.error('게시글 등록 오류:', error);
      alert(`게시글 등록 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  };

  const handleCancelPost = () => {
    setAiPreview(null);
    setShowAiPreview(false);
    setEditingPreview(false);
    setEditTitle('');
    setEditContent('');
  };

  const handleEditPreview = () => {
    setEditingPreview(true);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && editContent.trim()) {
      setAiPreview({
        title: editTitle.trim(),
        content: editContent.trim()
      });
      setEditingPreview(false);
    } else {
      alert('제목과 내용을 모두 입력해주세요.');
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(aiPreview?.title || '');
    setEditContent(aiPreview?.content || '');
    setEditingPreview(false);
  };

  async function handleSend(text: string) {
    const optimistic = { id: `tmp_${Date.now()}`, text, author: "me", createdAt: new Date() };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, author: "me" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...optimistic, id: data.id } : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError((e as Error).message);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] h-full min-h-0">
      {/* Community posts panel (left on desktop) */}
      <aside className="border-t lg:border-t-0 lg:border-r border-border h-full min-h-0 overflow-hidden">
        <CommunityPanel 
          roomId={roomId} 
          room={room} 
          messages={messages} 
          aiSummary={aiSummary}
        />
      </aside>

      {/* Chat area (right on desktop, ~1/3 width) */}
      <section className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="border-b border-border px-4 py-3 flex items-center gap-3">
          <div className="min-w-0">
            <div className="font-medium truncate">{title}</div>
            <div className="text-xs text-muted-foreground">총 120명 · 현재 15명 활동 중</div>
            {room?.description && (
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{room.description}</div>
            )}
          </div>
          <div className="flex-1" />
          <Button
            onClick={handleAISync}
            disabled={isGenerating || !messages || messages.length === 0}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            {isGenerating ? '🤖 AI 생성 중...' : '🤖 게시글 생성'}
          </Button>
          <button className="text-sm px-2 py-1 rounded border border-border hover:bg-accent">★ 즐겨찾기</button>
          <button className="text-sm px-2 py-1 rounded border border-border hover:bg-accent">⋮</button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          {loading && <div className="text-sm text-muted-foreground">불러오는 중…</div>}
          {error && <div className="text-sm text-destructive">오류: {error}</div>}
          
          {/* AI Summary */}
          {aiSummary && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">🤖 AI 요약</div>
              <div className="text-sm text-blue-800 dark:text-blue-200">{aiSummary}</div>
            </div>
          )}

          {/* AI 미리보기 표시 */}
          {showAiPreview && aiPreview && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-green-800 dark:text-green-200">🤖 AI가 생성한 게시글 미리보기</span>
                {!editingPreview && (
                  <button
                    onClick={handleEditPreview}
                    className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  >
                    수정
                  </button>
                )}
              </div>
              
              {editingPreview ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-green-800 dark:text-green-200 mb-1 block">제목:</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="게시글 제목을 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-green-800 dark:text-green-200 mb-1 block">내용:</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      rows={6}
                      placeholder="게시글 내용을 입력하세요"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">제목:</h4>
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">{aiPreview.title}</p>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">내용:</h4>
                    <div 
                      className="text-sm text-green-700 dark:text-green-300 max-h-32 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: aiPreview.content }}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmPost}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                    >
                      게시글로 등록
                    </button>
                    <button
                      onClick={handleCancelPost}
                      className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          
          {messages.map((m) => (
            <MessageItem 
              key={m.id} 
              author={m.author} 
              text={m.text} 
              ts={m.createdAt as any} 
              isMe={m.author === "me"}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-border px-4 py-3">
          <ChatInput onSend={handleSend} />
        </div>
      </section>

    </div>
  );
}
