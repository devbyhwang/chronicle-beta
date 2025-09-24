import { NextResponse } from "next/server";
import { getComment, updateComment, deleteComment, likeComment } from "@/server/inmemory";

type ParamsArg = { params: Promise<{ roomId: string; postId: string; commentId: string }> };

export async function GET(req: Request, { params }: ParamsArg) {
  const { roomId, postId, commentId } = await params;
  const comment = getComment(postId, commentId);
  if (!comment) {
    return NextResponse.json({ message: "댓글을 찾을 수 없습니다" }, { status: 404 });
  }
  return NextResponse.json({
    comment: {
      id: comment.id,
      postId: comment.postId,
      roomId: comment.roomId,
      parentId: comment.parentId,
      content: comment.content,
      author: comment.author,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      likes: comment.likes ?? 0,
      isDeleted: comment.isDeleted ?? false,
    }
  });
}

export async function PUT(req: Request, { params }: ParamsArg) {
  const { roomId, postId, commentId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const content = String(body?.content || "").trim();
    
    if (content.length < 1) {
      return NextResponse.json({ message: "댓글 내용을 입력해주세요" }, { status: 400 });
    }
    
    const comment = updateComment(postId, commentId, content);
    if (!comment) {
      return NextResponse.json({ message: "댓글을 찾을 수 없습니다" }, { status: 404 });
    }
    
    return NextResponse.json({
      ok: true,
      comment: {
        id: comment.id,
        postId: comment.postId,
        roomId: comment.roomId,
        parentId: comment.parentId,
        content: comment.content,
        author: comment.author,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        likes: comment.likes ?? 0,
        isDeleted: comment.isDeleted ?? false,
      }
    });
  } catch (e) {
    return NextResponse.json({ message: "댓글 수정 중 오류가 발생했습니다" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: ParamsArg) {
  const { roomId, postId, commentId } = await params;
  try {
    const comment = deleteComment(postId, commentId);
    if (!comment) {
      return NextResponse.json({ message: "댓글을 찾을 수 없습니다" }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: "댓글 삭제 중 오류가 발생했습니다" }, { status: 500 });
  }
}


