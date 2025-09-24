"use client";

import { use, useEffect, useState } from "react";
import { ContentRenderer } from "@/components/common/content-renderer";
import CommentSection from "@/components/common/comment-section";
import { Button } from "@/components/ui/button";

type Post = {
  id: string;
  title: string;
  content: string;
  author?: string;
  createdAt: string;
  views?: number;
  likes?: number;
  comments?: number;
};

type PostAnalysis = {
  hasDebatableContent: boolean;
  contentValidity: "high" | "medium" | "low";
  analysis: {
    controversy: string;
    validity: string;
    suggestions: string;
  };
  summary: string;
};

export default function PostDetailPage({ 
  params 
}: {
  params: Promise<{ roomId: string; postId: string }>;
}) {
  const { roomId, postId } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisJudgment, setAnalysisJudgment] = useState<{
    shouldAnalyze: boolean;
    reason: string;
    contentType: string;
  } | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch post data from API
        const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts/${encodeURIComponent(postId)}`, {
          cache: 'no-store'
        });
        
        if (!res.ok) {
          if (res.status === 404) {
            setError('게시글을 찾을 수 없습니다.');
          } else {
            setError('게시글을 불러오는 중 오류가 발생했습니다.');
          }
          return;
        }
        
        const data = await res.json();
        setPost(data);
        
        // Increment views
        await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts/${encodeURIComponent(postId)}/views`, {
          method: 'POST',
          cache: 'no-store'
        });
        
      } catch (e) {
        console.error('Failed to fetch post:', e);
        setError('게시글을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [roomId, postId]);

  const handleAnalyzePost = async () => {
    if (!post || analyzing) return;
    
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts/${encodeURIComponent(postId)}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '분석 중 오류가 발생했습니다.');
      }

      // 분석할 필요가 없는 경우
      if (!data.shouldAnalyze) {
        setAnalysisJudgment({
          shouldAnalyze: false,
          reason: data.reason,
          contentType: data.contentType
        });
        setShowAnalysis(true);
        return;
      }

      // 분석 결과가 있는 경우
      setAnalysis(data.analysis);
      setAnalysisJudgment({
        shouldAnalyze: true,
        reason: '',
        contentType: ''
      });
      setShowAnalysis(true);
    } catch (error) {
      console.error('Post analysis error:', error);
      alert(`분석 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-sm text-muted-foreground">게시글을 불러오는 중...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">{error || '게시글을 찾을 수 없습니다.'}</div>
        <a href={`/rooms/${roomId}`} className="text-sm underline">← 방으로 돌아가기</a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Main Content */}
        <div className="space-y-6">
          <div className="text-xs text-muted-foreground"><a className="underline" href={`/rooms/${roomId}`}>← 방으로</a></div>

          {/* Post Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">{post.title}</h1>
            <div className="text-sm text-muted-foreground">
              {post.author || "anon"} · {new Date(post.createdAt).toLocaleString()} · 조회 {post.views ?? 0} · 추천 {post.likes ?? 0} · 댓글 {post.comments ?? 0}
            </div>
          </div>

          {/* Post Content */}
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <ContentRenderer content={post.content} />
          </article>

          {/* Comments Section */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">댓글 {post.comments ?? 0}</h2>
            <CommentSection roomId={roomId} postId={postId} currentUser="me" />
          </div>
        </div>

        {/* AI Analysis Sidebar */}
        <div className="space-y-4">
          <div className="sticky top-6">
            <div className="border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">AI 내용 분석</h3>
                <Button
                  onClick={handleAnalyzePost}
                  disabled={analyzing}
                  variant="outline"
                  size="sm"
                >
                  {analyzing ? '분석 중...' : '🤖 분석하기'}
                </Button>
              </div>

              {showAnalysis && analysisJudgment && (
                <div className="space-y-4">
                  {!analysisJudgment.shouldAnalyze ? (
                    // 분석할 필요가 없는 경우
                    <div className="p-4 bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        ℹ️ 분석 불필요
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <strong>이유:</strong> {analysisJudgment.reason}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>내용 유형:</strong> {analysisJudgment.contentType}
                      </p>
                    </div>
                  ) : analysis ? (
                    // 분석 결과가 있는 경우
                    <>
                      {/* Analysis Summary */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">📊 분석 요약</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{analysis.summary}</p>
                      </div>

                      {/* Controversy Analysis */}
                      <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <h4 className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-2">
                          🔥 논쟁 가능성: {analysis.hasDebatableContent ? '높음' : '낮음'}
                        </h4>
                        <p className="text-sm text-orange-800 dark:text-orange-200">{analysis.analysis.controversy}</p>
                      </div>

                      {/* Content Validity */}
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                          ✅ 내용성 검증: {
                            analysis.contentValidity === 'high' ? '높음' : 
                            analysis.contentValidity === 'medium' ? '보통' : '낮음'
                          }
                        </h4>
                        <p className="text-sm text-green-800 dark:text-green-200">{analysis.analysis.validity}</p>
                      </div>

                      {/* Improvement Suggestions */}
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">💡 개선 제안</h4>
                        <p className="text-sm text-purple-800 dark:text-purple-200">{analysis.analysis.suggestions}</p>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
