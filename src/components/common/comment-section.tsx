"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CommentItem, { Comment } from "./comment-item";

interface CommentSectionProps {
  roomId: string;
  postId: string;
  currentUser?: string;
}

export default function CommentSection({ roomId, postId, currentUser = "me" }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load comments
  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts/${encodeURIComponent(postId)}/comments`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '댓글을 불러올 수 없습니다');
      setComments(data.comments || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          author: currentUser,
          parentId: replyingTo || undefined
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '댓글 작성에 실패했습니다');
      
      setNewComment("");
      setReplyingTo(null);
      await loadComments(); // Refresh comments
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '댓글 수정에 실패했습니다');
      
      await loadComments(); // Refresh comments
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '댓글 삭제에 실패했습니다');
      
      await loadComments(); // Refresh comments
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/like`, {
        method: 'POST'
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '좋아요 처리에 실패했습니다');
      
      await loadComments(); // Refresh comments
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    // Scroll to comment form
    document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Group comments by parent
  const topLevelComments = comments.filter(c => !c.parentId);
  const repliesByParent = comments.reduce((acc, comment) => {
    if (comment.parentId) {
      if (!acc[comment.parentId]) acc[comment.parentId] = [];
      acc[comment.parentId].push(comment);
    }
    return acc;
  }, {} as Record<string, Comment[]>);

  if (loading) {
    return <div className="text-sm text-gray-500">댓글을 불러오는 중...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Comment Form */}
      <form id="comment-form" onSubmit={handleSubmitComment} className="space-y-2">
        {replyingTo && (
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
            답글 작성 중... 
            <button 
              type="button" 
              onClick={() => setReplyingTo(null)}
              className="ml-2 text-blue-800 hover:underline"
            >
              취소
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? "답글을 작성하세요..." : "댓글을 작성하세요..."}
            className="flex-1"
            disabled={submitting}
          />
          <Button type="submit" disabled={!newComment.trim() || submitting}>
            {submitting ? "작성 중..." : "댓글"}
          </Button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-1">
        {topLevelComments.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            첫 번째 댓글을 작성해보세요!
          </div>
        ) : (
          topLevelComments.map(comment => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={handleReply}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                onLike={handleLikeComment}
                isMe={comment.author === currentUser}
                depth={0}
              />
              
              {/* Replies */}
              {repliesByParent[comment.id]?.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={handleReply}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  onLike={handleLikeComment}
                  isMe={reply.author === currentUser}
                  depth={1}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


