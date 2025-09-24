"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Comment {
  id: string;
  postId: string;
  roomId: string;
  parentId?: string;
  content: string;
  author?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  likes: number;
  isDeleted: boolean;
}

interface CommentItemProps {
  comment: Comment;
  onReply?: (parentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  isMe?: boolean;
  depth?: number;
}

export default function CommentItem({ 
  comment, 
  onReply, 
  onEdit, 
  onDelete, 
  onLike, 
  isMe = false,
  depth = 0 
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isLiking, setIsLiking] = useState(false);

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const handleEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit?.(comment.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await onLike?.(comment.id);
    } finally {
      setIsLiking(false);
    }
  };

  if (comment.isDeleted) {
    return (
      <div className={`py-2 text-sm text-gray-500 italic ${depth > 0 ? 'ml-8' : ''}`}>
        삭제된 댓글입니다
      </div>
    );
  }

  return (
    <div className={`py-2 ${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="flex items-start gap-2">
        {/* Author Avatar */}
        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0 mt-1">
          {comment.author?.charAt(0).toUpperCase() || 'A'}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Author & Time */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{comment.author || '익명'}</span>
            <span className="text-xs text-gray-500">{formatTime(comment.createdAt)}</span>
            {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
              <span className="text-xs text-gray-400">(수정됨)</span>
            )}
          </div>
          
          {/* Content */}
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="text-sm"
                placeholder="댓글을 수정하세요"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit}>저장</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}>취소</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
              {comment.content}
            </div>
          )}
          
          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleLike}
                disabled={isLiking}
                className="text-xs text-gray-500 hover:text-red-500 disabled:opacity-50"
              >
                👍 {comment.likes > 0 && comment.likes}
              </button>
              <button
                onClick={() => onReply?.(comment.id)}
                className="text-xs text-gray-500 hover:text-blue-500"
              >
                답글
              </button>
              {isMe && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-gray-500 hover:text-green-500"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete?.(comment.id)}
                    className="text-xs text-gray-500 hover:text-red-500"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


